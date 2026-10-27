import {defineConfig} from 'prisma/config';
// Explicit config only. Never imports prisma.config.ts or any dotenv file.
if(process.env.NODE_ENV!=='test'||process.env.WORKLINGO_BEGINNER_MAIN_TEST!=='1'||!process.env.TEST_DATABASE_URL||process.env.DATABASE_URL!==process.env.TEST_DATABASE_URL)throw Error('MAIN_PRISMA_ENVIRONMENT');
const url=new URL(process.env.TEST_DATABASE_URL);
if(url.hostname!=='127.0.0.1'||url.port!=='55432'||url.pathname!=='/worklingo'||url.username!=='wl_r12a_main_202610260003')throw Error('MAIN_PRISMA_IDENTITY');
export default defineConfig({schema:'prisma/schema.prisma'});
