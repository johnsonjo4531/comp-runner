# comp-runner

A competitive programming runner and small script runner that supports running single input files
through stdin into Deno, Node, and Python and outputs their stdout.

## Development

If you want to help make adjustments to this program follow the below.

For first time setup make sure you `git clone` this repo and `yarn install` at the root of the project.

Two commands are need to run simultaneously to develop this project:

Start webpack in watch mode (for react and frontend code):

```bash
yarn dev
```

Start electron-forge (for electron and backend code):

```bash
yarn start 
```

