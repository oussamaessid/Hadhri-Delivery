import type {Order} from '../data/demo';
import {allowedOrderStatuses} from '../../../lib/order-workflow.ts';
export function allowedStatuses(order:Order){return allowedOrderStatuses(order.status)}
export function changeStatus(order:Order,next:string):Order{
 if(!allowedStatuses(order).includes(next))throw new Error('Cette transition de statut n’est pas autorisée.');
 return {...order,status:next};
}
