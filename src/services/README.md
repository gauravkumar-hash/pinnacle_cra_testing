# 1. Issue with formData using native fetch
yarn add openapi-typescript openapi-typescript-codegen --dev
npx openapi -i http://localhost:8000/openapi.json -o src/services/openapi

# 2. Using Axios but not very clean 
npx openapi typegen http://localhost:8000/openapi.json > src/services/openapi.d.ts
```js
import type { Client } from "../../openapi.d.ts";
import OpenAPIClientAxios from 'openapi-client-axios';
// const api = new OpenAPIClientAxios({ definition: 'http://localhost:8000/openapi.json', axiosConfigDefaults: { baseURL: 'http://localhost:8000' } });
// const client = await api.getClient<Client>();
// client.update_branch_api_admin_branches__branch_id__put({ branch_id: branchId }, formData, { headers: { Authorization: `Bearer ${token}` } });

```
# 3. Recommended on FastAPI
[Guide](https://fastapi.tiangolo.com/advanced/generate-clients/)
npm install @hey-api/openapi-ts --save-dev
npx openapi-ts --input http://localhost:8000/openapi.json --output ./src/services/client --client axios
yarn gen-client