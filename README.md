# Rittal Edge Delivery Services

An AEM Edge Delivery Services project based on the Adobe EDS Boilerplate. The initial migration targets the German Rittal site at https://www.rittal.com/de-de/.

The initial scope is limited to the homepage and its first-level areas: Online Shop, Produkte, Software, Lösungen, Konfiguration, Services, and Unternehmen. Do not treat this as authorization to import deeper pages.

## Environments
- Preview: https://main--rittal--mica1973.aem.page/
- Live: https://main--rittal--mica1973.aem.live/

## Documentation

Before using the aem-boilerplate, we recommend you to go through the documentation on https://www.aem.live/docs/ and more specifically:
1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `aem-boilerplate` template
1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the `{repo}` directory in your favorite IDE and start coding :)
