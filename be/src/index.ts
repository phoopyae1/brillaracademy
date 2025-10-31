import 'dotenv/config';
import app from './app.js';
import { ensureInitialItAdmin } from './services/staffService.js';

const port = Number(process.env.PORT ?? 4000);

ensureInitialItAdmin()
  .then((admin) => {
    console.info('Ensured initial IT admin account for %s', admin.email);
  })
  .catch((error) => {
    console.error('Failed to ensure IT admin account', error);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`Brillar Academy API listening on http://localhost:${port}`);
    });
  });
