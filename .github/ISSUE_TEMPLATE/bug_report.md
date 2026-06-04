name: 🐞 Bug Report
description: Report a bug to help improve TGWrapper
body:
  - type: markdown
    attributes:
      value: |
        Please verify that the bug is reproducible with the latest release version of the packages.
  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: A clear and concise description of what the bug is.
      placeholder: Describe what happened...
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: Provide a minimal, complete, and verifiable example (MCVE) or clear steps.
      placeholder: |
        1. createBotClient({ ... })
        2. Send specific update payload
        3. Observe error output...
    validations:
      required: true
  - type: input
    id: environment
    attributes:
      label: Environment Info
      description: Node.js version, platform, framework versions (e.g. Node 20.10, Cloudflare Workers, TGWrapper 0.14.0)
      placeholder: Node 20, CF Workers, @jilimb0/tgwrapper@0.14.0
    validations:
      required: true
