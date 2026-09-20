export function bootstrapState(demo, enabled){
 if(enabled)return demo();
 return {catalog:{restaurants:[],categories:[],products:[],departments:[],customers:[],drivers:[]},orders:[],notifications:[],settings:{name:'Hadhri Delivery',email:'',fee:4,loyaltyEnabled:true}};
}
