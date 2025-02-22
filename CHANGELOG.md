# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.5.0](https://github.com/nestorzamili/whatsapp-blast/compare/v1.4.1...v1.5.0) (2025-02-22)


### Features

* add Dockerfile for application deployment ([49c0689](https://github.com/nestorzamili/whatsapp-blast/commit/49c06894eea18c568bee4197d9387035f69d5234))

## [1.4.1](https://github.com/nestorzamili/whatsapp-blast/compare/v1.4.0...v1.4.1) (2025-02-22)


### Chores

* remove Dockerfile ([a7f4ede](https://github.com/nestorzamili/whatsapp-blast/commit/a7f4edef09930de29f26acae3a1d93d8fdda122d))

## [1.4.0](https://github.com/nestorzamili/whatsapp-blast/compare/v1.3.0...v1.4.0) (2025-02-22)


### Features

* update deployment workflows and improve Docker integration ([02bfa11](https://github.com/nestorzamili/whatsapp-blast/commit/02bfa11ec73a78f9f2c79da92736916945e9b3d0))

## [1.3.0](https://github.com/nestorzamili/whatsapp-blast/compare/v1.2.3...v1.3.0) (2025-02-22)


### Features

* add Docker support with Dockerfile and .dockerignore ([8a4dd34](https://github.com/nestorzamili/whatsapp-blast/commit/8a4dd34e294b84b4871dab1f342870ff6db96fa2))

## [1.2.3](https://github.com/nestorzamili/whatsapp-blast/compare/v1.2.2...v1.2.3) (2025-02-22)


### Chores

* update Docker workflow to trigger on release-please completion ([3bc202f](https://github.com/nestorzamili/whatsapp-blast/commit/3bc202f1456e328d8c5dc0ac210de3a1798e35ed))

## [1.2.2](https://github.com/nestorzamili/whatsapp-blast/compare/v1.2.1...v1.2.2) (2025-02-22)


### Chores

* update Docker workflow to use release-please action ([70579f2](https://github.com/nestorzamili/whatsapp-blast/commit/70579f2920e6692a3425adf0435509b8adb032b2))

## [1.2.1](https://github.com/nestorzamili/whatsapp-blast/compare/v1.2.0...v1.2.1) (2025-02-22)


### Bug Fixes

* update Docker workflow to build and push latest image on workflow completion ([741717e](https://github.com/nestorzamili/whatsapp-blast/commit/741717e421c273662a73ee8434cf1599776ce1e5))

## [1.2.0](https://github.com/nestorzamili/whatsapp-blast/compare/v1.1.4...v1.2.0) (2025-02-22)


### Features

* add GitHub workflows for Docker image build and deployment ([ca98524](https://github.com/nestorzamili/whatsapp-blast/commit/ca98524880a278288eaa59e5c0a879bfd09d94ea))


### Code Refactoring

* rename models to lowercase for consistency ([3157a84](https://github.com/nestorzamili/whatsapp-blast/commit/3157a843104690f83967b49d09d8bb206e8bdc67))

## [1.1.4](https://github.com/nestorzamili/whatsapp-blast/compare/v1.1.3...v1.1.4) (2025-02-22)


### Bug Fixes

* **client:** prevent multiple initializations for the same client ([451e429](https://github.com/nestorzamili/whatsapp-blast/commit/451e429341372353eeb1b90309789792fbe2a6d9))

## [1.1.3](https://github.com/nestorzamili/whatsapp-blast/compare/v1.1.2...v1.1.3) (2025-02-22)


### Chores

* add release-please configuration ([283389c](https://github.com/nestorzamili/whatsapp-blast/commit/283389ced725ef6f2be210df99b7e3929cfa0be7))
* remove standard-version config and dependency ([19b7ef7](https://github.com/nestorzamili/whatsapp-blast/commit/19b7ef715662fc7965e7809bf7773448d73c0e07))

## [1.1.2](https://github.com/nestorzamili/whatsapp-bulk/compare/v1.1.0...v1.1.2) (2025-02-22)



## 1.1.0 (2025-02-21)


### Features

* add health check endpoint and define UserPayload and VerificationResult types ([cf442fc](https://github.com/nestorzamili/whatsapp-bulk/commit/cf442fc5cf907d71bc70ed79db721e9ac0489964))
* add media handling for messages; integrate Cloudinary for media uploads and update message model ([c294b4a](https://github.com/nestorzamili/whatsapp-bulk/commit/c294b4a1d11ad703313b6694db7626472fc67d9d))
* enhance client QR code handling and implement QR generation limits ([3567c11](https://github.com/nestorzamili/whatsapp-bulk/commit/3567c11d6ad363451cd59436a7ee2bb8bb8194d1))
* enhance media upload handling with file type validation and size limits ([884d915](https://github.com/nestorzamili/whatsapp-bulk/commit/884d9150f68122cef2e330820011a892c317e841))
* enhance media upload with file type validation, size limits, and improved error handling ([f872ac5](https://github.com/nestorzamili/whatsapp-bulk/commit/f872ac5d4090cd5c5938e3bb4710304e686ab6b0))
* implement batch processing for message sending; add progress tracking, client error handling, and idle handling ([4f45b77](https://github.com/nestorzamili/whatsapp-bulk/commit/4f45b7721e52ea1206072b70a65f0d91e7db2d75))
* implement client and message routes, update client status, and enhance email verification process ([3e39b9e](https://github.com/nestorzamili/whatsapp-bulk/commit/3e39b9e2d42a6db528817764617eee79391de1ee))
* implement client management; add initialization, logout, and status retrieval for WhatsApp clients ([42de335](https://github.com/nestorzamili/whatsapp-bulk/commit/42de3356d03b382c8af10b4eb0927967f4e9f991))
* implement quota management with add and check endpoints, integrate with message processing ([5ad59d1](https://github.com/nestorzamili/whatsapp-bulk/commit/5ad59d101e6679f998b963923af03a4564d554f7))
* rename project to whatsapp-bulk; update directory structure and add new controllers, services, and routes ([283fe84](https://github.com/nestorzamili/whatsapp-bulk/commit/283fe8499edd0d0fa1869c22fe529f10fc91e0d4))


### Bug Fixes

* update logo URL in email verification template ([99a07eb](https://github.com/nestorzamili/whatsapp-bulk/commit/99a07ebba2954b530c139ad72602a5304b338f05))


### Chores

* update @prisma/client ([b534869](https://github.com/nestorzamili/whatsapp-bulk/commit/b5348691ddb98c71fc9c7ea07d1142247a4edd11))


### Code Refactoring

* add type annotation for Message in createMessages return mapping ([bac0ad8](https://github.com/nestorzamili/whatsapp-bulk/commit/bac0ad87b201a016997a0b6fc2689cb50ad96ebc))
* add TypeScript module declarations for cors, morgan, jsonwebtoken, nodemailer, and qrcode-terminal ([1cece06](https://github.com/nestorzamili/whatsapp-bulk/commit/1cece062f27d595f526cc211b4b9b9cfbfb97e78))
* add TypeScript types for cors, jsonwebtoken, morgan, nodemailer, and qrcode-terminal; update Node engine version in package.json ([fbf93ed](https://github.com/nestorzamili/whatsapp-bulk/commit/fbf93edfbf44345171b8285d8d4a4384c38ab655))
* add TypeScript types for node, express, cors, jsonwebtoken, nodemailer, morgan, and qrcode-terminal ([15ae3d1](https://github.com/nestorzamili/whatsapp-bulk/commit/15ae3d12dc091b3e510f617aceb464268ff63f8a))
* remove unused import of Message from prisma client ([dbe93bd](https://github.com/nestorzamili/whatsapp-bulk/commit/dbe93bd7a24d7416bacb37c5de4bcbe4f6b4c8d3))
* remove unused message interfaces and JWT payload types; consolidate type definitions in types.d.ts ([e8bb736](https://github.com/nestorzamili/whatsapp-bulk/commit/e8bb736ae4728a219acd57492f871fbd25f108ca))
* rename project to whatsapp-blast; update type definitions and message handling ([eeb8e1c](https://github.com/nestorzamili/whatsapp-bulk/commit/eeb8e1cacfd99eb4c9ec420b9e10bc0a71f1e185))
* replace WhatsAppService with clientService and remove BatchProcessor ([5cb0067](https://github.com/nestorzamili/whatsapp-bulk/commit/5cb006731007109fa2fe3a60fa8d746da1fdf99c))
* simplify start script in package.json and remove unused TypeScript build info ([beae14f](https://github.com/nestorzamili/whatsapp-bulk/commit/beae14fdd3d6dbb33f0fa9d4886f2cc0ccb11f3e))
* update main entry point and start script to use built JavaScript file ([0d241aa](https://github.com/nestorzamili/whatsapp-bulk/commit/0d241aa06ef918878c4fb42d175fe85faddd069f))
* update main entry point to use TypeScript source file ([f680c38](https://github.com/nestorzamili/whatsapp-bulk/commit/f680c3851fd8896b0f1948765bff20859e482601))
* update mediaUrl handling to allow null values and adjust related types ([56e86e3](https://github.com/nestorzamili/whatsapp-bulk/commit/56e86e375cc0be5e255125740b30e3abc4b31770))
* update TypeScript configuration and add build script; include dist in .gitignore ([0f848b0](https://github.com/nestorzamili/whatsapp-bulk/commit/0f848b0d806114e276773fdba34a78739d025d29))


### Documentation

* update README to include quota management and advanced monitoring features ([02751ca](https://github.com/nestorzamili/whatsapp-bulk/commit/02751ca0a818807979b4f2568f6fe7f74699f76e))
* update README to reflect API features and structure ([10e13c4](https://github.com/nestorzamili/whatsapp-bulk/commit/10e13c432a6744d8b125816ad67ad6784fce11d1))
