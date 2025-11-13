const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

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
 * Middleware to validate Keycloak JWT + roles
 * Realm & clientId are read from cookies
 * @param {string[]} requiredRoles - Optional array of roles required to access route
 */
function validateKeycloakToken(requiredRoles = []) {
  return async (req, res, next) => {
    try {
      // Get token from Authorization header or cookies
      const token =
      req.cookies?.access_token || req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Missing token" });

      // Read realm & clientId from cookies
      const realm = req.cookies?.realm;
      const clientId = req.cookies?.clientId;

      if (!realm || !clientId) {
        return res
          .status(400)
          .json({ message: "Missing realm or clientId in cookies" });
      }

      // Decode token header to get KID
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader?.header?.kid)
        return res.status(401).json({ message: "Invalid token header" });

      const kid = decodedHeader.header.kid;

      // Fetch public key from Keycloak
      const publicKey = await getPublicKey(realm, kid);

      // Verify token
      const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });

      // Validate clientId (azp claim)
      if (decoded.azp !== clientId) {
        return res.status(401).json({ message: "Invalid clientId" });
      }

      // Check required roles
      const userRoles = decoded?.realm_access?.roles || [];
      const hasRole =
        requiredRoles.length === 0 ||
        requiredRoles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        return res
          .status(403)
          .json({ message: "Access denied: missing required role" });
      }

      // ✅ Attach info to request
      req.user = decoded;
      req.realm = realm;
      req.clientId = clientId;
      req.token = token;

      next();
    } catch (err) {
      console.error("Token validation error:", err.message);
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token has expired" });
      }
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}

module.exports = { validateKeycloakToken };
