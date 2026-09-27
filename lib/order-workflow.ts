// Keep historical states readable; new orders use three admin actions.
export const orderSteps = ['CONFIRMED', 'ON_THE_WAY', 'DELIVERED'];
export function allowedOrderStatuses(status:string):string[] {
 if(status==='DELIVERED'||status==='CANCELLED')return [status];
 const next=status==='ON_THE_WAY'?'DELIVERED':status==='PENDING'?'CONFIRMED':
  ['CONFIRMED','PREPARING','READY_FOR_PICKUP','DRIVER_ASSIGNED','PICKED_UP'].includes(status)?'ON_THE_WAY':undefined;
 return [status,...(next?[next]:[]),'CANCELLED'];
}
