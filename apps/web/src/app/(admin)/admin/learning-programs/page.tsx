import { AdminLearningPrograms } from '../../../../features/admin-learning-programs/admin-learning-programs';
export default async function Page({searchParams}:{searchParams:Promise<{programId?:string}>}) {const {programId}=await searchParams;return <AdminLearningPrograms {...(programId?{initialProgramId:programId}:{})}/>;}
