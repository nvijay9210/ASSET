const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const axios = require("axios");
const qs = require("qs");

/**
 * Create a JWKS client for a given Keycloak realm
 */
function getKeycloakClient(realm) {
  return jwksClient({
    jwksUri: `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/certs`,
  });
}

/**
 * Fetch the public key for a given KID
 */
async function getPublicKey(realm, kid) {
  const client = getKeycloakClient(realm);
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      resolve(key.getPublicKey());
    });
  });
}

/**
 * Refresh Keycloak token
 */
async function refreshToken(refreshToken, realm, clientId) {
  const url = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;

  const data = qs.stringify({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });

  const resp = await axios.post(url, data, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return {
    accessToken: resp.data.access_token,
    refreshToken: resp.data.refresh_token,
  };
}

/**
 * Main validateToken middleware with auto-refresh
 */
function validateKeycloakToken(requiredRoles = []) {
  return async (req, res, next) => {
    try {
      // ------------------------------
      // GET TOKENS
      // ------------------------------
      let accessToken =
        req.cookies?.access_token ||
        req.headers.authorization?.split(" ")[1];

      const refreshTokenCookie = req.cookies?.refresh_token;
      const realm = req.cookies?.realm;
      const clientId = req.cookies?.clientId;

      if (!accessToken)
        return res.status(401).json({ message: "Missing access token" });

      if (!realm || !clientId)
        return res
          .status(400)
          .json({ message: "Missing realm or clientId in cookies" });

      // ------------------------------
      // DECODE TO GET KID
      // ------------------------------
      let decodedHeader = jwt.decode(accessToken, { complete: true });
      if (!decodedHeader?.header?.kid)
        return res.status(401).json({ message: "Invalid token header" });

      let kid = decodedHeader.header.kid;
      let publicKey = await getPublicKey(realm, kid);

      let decodedUser;

      // ------------------------------
      // TRY VERIFY ACCESS TOKEN
      // ------------------------------
      try {
        decodedUser = jwt.verify(accessToken, publicKey, {
          algorithms: ["RS256"],
        });
      } catch (err) {
        // -----------------------------------------
        // ACCESS TOKEN EXPIRED → REFRESH IT
        // -----------------------------------------
        if (err.name === "TokenExpiredError") {
          if (!refreshTokenCookie) {
            return res.status(401).json({
              message: "Token expired and no refresh token found",
            });
          }

          console.log("🔄 Access token expired → Refreshing...");

          try {
            const newTokens = await refreshToken(
              refreshTokenCookie,
              realm,
              clientId
            );

            // UPDATE COOKIES
            res.cookie("access_token", newTokens.accessToken, {
              httpOnly: true,
              sameSite: "lax",
            });

            res.cookie("refresh_token", newTokens.refreshToken, {
              httpOnly: true,
              sameSite: "lax",
            });

            // REVERIFY NEW TOKEN
            accessToken = newTokens.accessToken;
            decodedHeader = jwt.decode(accessToken, { complete: true });
            kid = decodedHeader.header.kid;
            publicKey = await getPublicKey(realm, kid);

            decodedUser = jwt.verify(accessToken, publicKey, {
              algorithms: ["RS256"],
            });

            console.log("✅ Token refreshed successfully");

          } catch (refreshErr) {
            console.log("❌ Refresh failed:", refreshErr.response?.data);
            return res.status(401).json({
              message: "Session expired. Please login again.",
            });
          }
        } else {
          return res.status(401).json({ message: "Invalid token" });
        }
      }

      // ------------------------------
      // VALIDATE CLIENT ID
      // ------------------------------
      if (decodedUser.azp !== clientId) {
        return res.status(401).json({ message: "Invalid clientId" });
      }

      // ------------------------------
      // ROLE CHECK
      // ------------------------------
      const userRoles = decodedUser?.realm_access?.roles || [];
      const hasRole =
        requiredRoles.length === 0 ||
        requiredRoles.some((r) => userRoles.includes(r));

      if (!hasRole) {
        return res
          .status(403)
          .json({ message: "Access denied: missing required role" });
      }

      // Attach user
      req.user = decodedUser;
      req.token = accessToken;
      req.realm = realm;
      req.clientId = clientId;

      next();
    } catch (err) {
      console.error("Token validation error:", err);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}

module.exports = { validateKeycloakToken };
