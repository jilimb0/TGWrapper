# Publishing Trust & Provenance Reference

This reference defines the security infrastructure and configurations used to publish TGWrapper packages to the npm registry without static, long-lived authentication tokens.

---

## 🔒 Tokenless Releases via OIDC

We enforce **Trusted Publishing** using OpenID Connect (OIDC) authentication exchanges between GitHub Actions runner nodes and the npm registry.

```
  [GitHub Actions Runner] ──( Request ephemeral JWT )──> [GitHub OIDC Provider]
             │                                                     │
             │                                            ( Returns Signed OIDC Token )
             ▼                                                     ▼
      [npm Registry] <──( Auth challenge with JWT )──────────────┘
             │
      ( Validates claims & publishes packages )
```

### Key Advantages
- **No Static secrets:** We do not store permanent npm tokens inside GitHub Secrets settings. Compromising the repository does not leak long-lived write credentials.
- **Short-Lived sessions:** Authentication tokens generated via OIDC expire automatically after 10 minutes.
- **Strict Repository Boundaries:** npm only accepts publication updates coming from exact, pre-configured workflow paths matching this repository.

---

## 🛡️ GitHub Actions Permissions Policy

To request OIDC identities, the release execution workflow must be explicitly configured with minimum scope permissions:

```yaml
permissions:
  id-token: write   # Required to fetch the OIDC JWT token
  contents: write   # Required to create git releases/tags
  packages: write   # Required for packages registry updates
```

---

## 🔬 Release Provenance

We build and publish packages using the `--provenance` flag.

### Verifying Provenance
Every release contains signed cryptographic proofs linking the built package directly back to the matching git commit SHA inside the release workflow. 

Verify the build origin locally before installing updates:
```bash
npm info @jilimb0/tgwrapper --json | grep provenance
```
Confirming that the build was initiated by official workflows guarantees that the artifact has not been modified or replaced in transit.
