const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

// ✅ Get allowed realms from env var (comma-separated)
// const ALLOWED_REALMS = process.env.KEYCLOAK_REALM
//   ? process.env.KEYCLOAK_REALM.split(",").map(r => r.trim())
//   : [];

function getKeycloakClient(realm) {
  return jwksClient({
    jwksUri: `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/certs`,
  });
}

// ✅ Async function to fetch public key by KID
async function getPublicKey(realm, kid) {
  const client = getKeycloakClient(realm);
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

function authenticateTenantClinicGroup(requiredRoles = []) {
  return async (req, res, next) => {
    try {
      // ✅ Dev mode bypass
      if (process.env.KEYCLOAK_POWER === 'off') {
        req.user = {
          username: "dev-user",
          realm_access: { roles: requiredRoles },
          groups: ["dev-group"],
        };
        req.realm = req.headers["x-realm"] || "dev-realm";
        req.token = "dev-token";
        return next();
      }

      // ✅ Extract token and x-realm header
      const token = req.headers.authorization?.split(" ")[1] || req.headers["access_token"];;
      const headerRealm = req.headers["x-realm"]; // Optional override

      if (!token) {
        return res.status(401).json({ message: "Missing authorization token" });
      }

      // ✅ STEP 1: Decode header to extract KID and ISS
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || !decodedHeader.header.kid || !decodedHeader.payload.iss) {
        return res.status(401).json({ message: "Invalid token format" });
      }

      const kid = decodedHeader.header.kid;
      const issuer = decodedHeader.payload.iss; // e.g., "http://localhost:8080/realms/dentalhub"

      // ✅ STEP 2: Extract realm name from iss
      let extractedRealm;
      try {
        const url = new URL(issuer);
        const pathParts = url.pathname.split("/").filter(Boolean);
        extractedRealm = pathParts[pathParts.length - 1]; // Last part = realm name
      } catch (err) {
        return res.status(401).json({ message: "Invalid issuer URL in token" });
      }

      // ✅ STEP 3: Validate realm against allowed list
      // if (!ALLOWED_REALMS.includes(extractedRealm)) {
      //   console.warn(`❌ Token from unauthorized realm: ${extractedRealm}`);
      //   return res.status(401).json({
      //     message: `Access denied: realm '${extractedRealm}' not allowed.`,
      //     allowedRealms: ALLOWED_REALMS,
      //   });
      // }

      // ✅ STEP 4: Use extracted realm (not x-realm header!) for JWKS lookup
      const realm = extractedRealm;

      // ✅ Optional: Allow override via x-realm header (for testing/debugging)
      // if (headerRealm && headerRealm !== realm) {
      //   console.warn(`⚠️ x-realm header (${headerRealm}) does not match token realm (${realm}). Using token realm.`);
      //    return res.status(401).json({
      //     message: `Access denied: realm '${extractedRealm}' not allowed.`,
      //     allowedRealms: ALLOWED_REALMS,
      //   });
      // }

      // ✅ STEP 5: Fetch public key and verify token
      const publicKey = await getPublicKey(realm, kid);

      const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });

      // ✅ STEP 6: Extract roles and groups
      const realmRoles = decoded?.realm_access?.roles || [];
      const userGroups = decoded?.groups || [];

      const hasRequiredRole =
        requiredRoles.length === 0 ||
        requiredRoles.some((role) => realmRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({ message: "Access denied: missing required realm role" });
      }

      // ✅ Auto-assign tenant_id/clinic_id for superuser
      if (realmRoles.includes("superuser")) {
        const group = userGroups.find((g) => g.startsWith("dental-"));
        if (group) {
          const match = group.match(/dental-(\d+)-(\d+)/);
          if (match) {
            req.body = {
              ...req.body,
              tenant_id: Number(match[1]),
              clinic_id: Number(match[2]),
            };
          }
        }
      }

      // ✅ Skip group validation for tenant/guest
      if (realmRoles.includes("tenant") || realmRoles.includes("guest")) {
        req.token = token;
        req.user = decoded;
        req.realm = realm;
        return next();
      }

      // ✅ Validate group membership if tenant_id/clinic_id provided
      const tenant_id =
        req.body?.tenant_id || req.query?.tenant_id || req.params?.tenant_id;
      const clinic_id =
        req.body?.clinic_id || req.query?.clinic_id || req.params?.clinic_id;

      if (tenant_id && clinic_id) {
        const groupName = `dental-${tenant_id}-${clinic_id}`;
        if (!userGroups.includes(groupName)) {
          return res.status(403).json({ message: `Access denied: user not in group ${groupName}` });
        }
      }

      // ✅ Success!
      req.token = token;
      req.user = decoded;
      req.realm = realm;

      next();

    } catch (err) {
      console.error("Authentication Error:", err);

      if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token has expired" });
      }

      return res.status(500).json({
        message: "Authentication failed",
        error: err.message,
      });
    }
  };
}

module.exports = { authenticateTenantClinicGroup };