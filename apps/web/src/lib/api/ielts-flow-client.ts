import { ieltsFlowOverviewSchema, ieltsHistoryPageSchema } from '@worklingo/contracts';
import { ieltsRequest } from './ielts-request';
export const ieltsFlowClient={
  overview:()=>ieltsRequest('/me/ielts-overview',ieltsFlowOverviewSchema),
  history:(cursor?:string)=>ieltsRequest(`/me/ielts-history${cursor?`?cursor=${encodeURIComponent(cursor)}`:''}`,ieltsHistoryPageSchema),
};
