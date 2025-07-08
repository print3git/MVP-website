# Backend

## Sparc3D Client

The `generateGlb` function wraps the Sparc3D inference endpoint.

```ts
import { generateGlb } from './src/lib/sparc3dClient';

const buffer = await generateGlb({ prompt: 'low poly tree' });
// with image guidance
const withImg = await generateGlb({
  prompt: 'wooden chair',
  imageURL: 'https://example.com/chair.jpg'
});
```

The returned `Buffer` contains the generated `.glb` data.
