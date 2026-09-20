"""Generate the proposed Wasla V1 REST contract. No route implementation is implied."""
import json
from pathlib import Path
S={}
def ref(name):return {'$ref':'#/components/schemas/'+name}
def string(**kw):return {'type':'string',**kw}
def number(**kw):return {'type':'number','minimum':0,**kw}
def integer(**kw):return {'type':'integer','minimum':0,**kw}
def array(item):return {'type':'array','items':item}
def obj(props,required=()):return {'type':'object','properties':props,**({'required':list(required)} if required else {})}
def schema(name,props,required=()):S[name]=obj(props,required);return ref(name)
uid=string(format='uuid');date=string(format='date-time');money=number(multipleOf=0.01,example=17);boolean={'type':'boolean'}
role=string(enum=['CUSTOMER','ADMIN','DRIVER','RESTAURANT_OWNER','SHOP_OWNER'])
status=string(enum=['PENDING','CONFIRMED','PREPARING','READY_FOR_PICKUP','DRIVER_ASSIGNED','PICKED_UP','ON_THE_WAY','DELIVERED','CANCELLED'])
schema('Error',{'statusCode':integer(example=400),'code':string(example='VALIDATION_ERROR'),'message':string(example='Données invalides'),'details':array(string())},['statusCode','code','message'])
schema('User',{'id':uid,'name':string(example='Amira Ben Ali'),'email':string(format='email',example='client@example.com'),'phone':string(example='+21620000100'),'role':role,'isActive':boolean,'createdAt':date},['id','name','role','isActive'])
schema('RegisterInput',{'name':string(minLength=2),'email':string(format='email'),'phone':string(),'password':string(format='password',minLength=12,writeOnly=True)},['name','email','phone','password'])
schema('LoginInput',{'email':string(format='email'),'password':string(format='password',writeOnly=True)},['email','password'])
schema('TokenPair',{'accessToken':string(description='JWT à courte durée de vie'),'refreshToken':string(description='Jeton opaque renouvelable'),'expiresIn':integer(example=900),'user':ref('User')},['accessToken','refreshToken','expiresIn','user'])
schema('RefreshInput',{'refreshToken':string()},['refreshToken'])
schema('UserUpdate',{'name':string(minLength=2),'phone':string(),'isActive':boolean})
schema('ProfileUpdate',{'name':string(minLength=2),'phone':string()})
schema('RoleUpdate',{'role':role},['role'])
schema('PasswordChange',{'currentPassword':string(format='password',writeOnly=True),'newPassword':string(format='password',minLength=12,writeOnly=True)},['currentPassword','newPassword'])
schema('PasswordResetRequest',{'email':string(format='email')},['email'])
schema('PasswordReset',{'token':string(),'newPassword':string(format='password',minLength=12,writeOnly=True)},['token','newPassword'])
schema('Message',{'message':string(example='Demande enregistrée')},['message'])
merchant_fields={'name':string(example='La Tavola'),'nameArabic':string(example='لا تافولا'),'description':string(),'logo':string(format='uri'),'coverImage':string(format='uri'),'phone':string(),'address':string(),'latitude':{'type':'number','minimum':-90,'maximum':90},'longitude':{'type':'number','minimum':-180,'maximum':180},'isActive':boolean,'isOpen':boolean,'deliveryFee':money,'minimumOrder':money,'estimatedDeliveryTime':integer(example=30),'categoryId':uid}
schema('MerchantInput',merchant_fields,['name','phone','address','deliveryFee'])
schema('MerchantUpdate',merchant_fields)
schema('Merchant',{'id':uid,'type':string(enum=['RESTAURANT','SHOP']),**merchant_fields,'rating':number(maximum=5),'createdAt':date,'updatedAt':date},['id','name','type','isActive','isOpen'])
schema('AvailabilityInput',{'isActive':boolean,'isOpen':boolean})
schema('OpeningHour',{'dayOfWeek':integer(maximum=6,description='0 = dimanche'),'opensAt':string(pattern='^[0-2][0-9]:[0-5][0-9]$',example='09:00'),'closesAt':string(pattern='^[0-2][0-9]:[0-5][0-9]$',example='23:00'),'closed':boolean},['dayOfWeek','closed'])
schema('OpeningHoursInput',{'hours':array(ref('OpeningHour'))},['hours'])
cat={'name':string(example='Pizza'),'nameArabic':string(example='بيتزا'),'image':string(format='uri'),'merchantId':uid,'isActive':boolean,'sortOrder':integer()}
schema('CategoryInput',cat,['name']);schema('CategoryUpdate',cat);schema('Category',{'id':uid,**cat},['id','name'])
product={'merchantId':uid,'categoryId':uid,'name':string(example='Pizza 4 Fromages'),'nameArabic':string(),'description':string(),'descriptionArabic':string(),'image':string(format='uri'),'price':money,'stock':integer(example=20),'isAvailable':boolean,'isActive':boolean}
schema('ProductInput',product,['merchantId','categoryId','name','price','stock']);schema('ProductUpdate',product)
schema('VariantInput',{'name':string(example='Grande'),'price':money,'isAvailable':boolean},['name','price'])
schema('Variant',{'id':uid,'productId':uid,'name':string(),'price':money,'isAvailable':boolean},['id','productId','name','price'])
schema('OptionInput',{'name':string(example='Fromage supplémentaire'),'price':money,'groupName':string(example='Suppléments'),'isRequired':boolean,'isAvailable':boolean},['name','price'])
schema('Option',{'id':uid,'productId':uid,**S['OptionInput']['properties']},['id','productId','name','price'])
schema('Product',{'id':uid,**product,'variants':array(ref('Variant')),'options':array(ref('Option')),'createdAt':date,'updatedAt':date},['id','merchantId','name','price','stock'])
schema('StockInput',{'stock':integer(),'reason':string()},['stock'])
schema('ProductAvailability',{'isAvailable':boolean,'isActive':boolean})
address={'label':string(enum=['HOME','WORK','OTHER']),'address':string(minLength=10),'latitude':{'type':'number','minimum':-90,'maximum':90},'longitude':{'type':'number','minimum':-180,'maximum':180},'building':string(),'floor':string(),'apartment':string(),'additionalInstructions':string(maxLength=500)}
schema('AddressInput',address,['label','address']);schema('AddressUpdate',address);schema('Address',{'id':uid,'userId':uid,**address},['id','userId','label','address'])
schema('CartItemInput',{'productId':uid,'quantity':integer(minimum=1,example=2),'variantId':uid,'optionIds':array(uid)},['productId','quantity'])
schema('QuantityInput',{'quantity':integer(minimum=1)},['quantity'])
schema('CartItem',{'id':uid,'productId':uid,'name':string(),'quantity':integer(minimum=1),'unitPrice':money,'variantId':uid,'optionIds':array(uid),'subtotal':money},['id','productId','quantity','unitPrice','subtotal'])
schema('Cart',{'id':uid,'userId':uid,'merchantId':uid,'items':array(ref('CartItem')),'subtotal':money,'deliveryFee':money,'total':money},['id','userId','items','subtotal','deliveryFee','total'])
schema('CreateOrderInput',{'addressId':uid,'paymentMethod':string(enum=['CASH_ON_DELIVERY'],default='CASH_ON_DELIVERY'),'notes':string(maxLength=500)},['addressId','paymentMethod'])
schema('Order',{'id':uid,'reference':string(example='CMD-10482'),'customerId':uid,'merchantId':uid,'driverId':uid,'status':status,'items':array(ref('CartItem')),'address':ref('Address'),'subtotal':money,'deliveryFee':money,'total':money,'paymentMethod':string(enum=['CASH_ON_DELIVERY']),'paymentStatus':string(enum=['UNPAID','PAID']),'notes':string(),'createdAt':date,'deliveredAt':date},['id','reference','customerId','merchantId','status','items','total','paymentMethod','createdAt'])
schema('OrderStatusInput',{'status':status,'reason':string()},['status'])
schema('CancelInput',{'reason':string(minLength=3)},['reason'])
schema('AssignDriverInput',{'driverId':uid},['driverId'])
schema('Tracking',{'orderId':uid,'status':status,'driverId':uid,'estimatedArrival':date,'events':array(obj({'status':status,'timestamp':date},['status','timestamp']))},['orderId','status','events'])
driver={'name':string(),'phone':string(),'email':string(format='email'),'photo':string(format='uri'),'vehicle':string(enum=['MOTORCYCLE','CAR','BICYCLE']),'plate':string(),'zone':string(),'status':string(enum=['AVAILABLE','BUSY','OFFLINE','SUSPENDED'])}
schema('DriverInput',{**driver,'password':string(format='password',minLength=12,writeOnly=True)},['name','phone','email','password','vehicle','zone'])
schema('DriverUpdate',driver);schema('Driver',{'id':uid,'userId':uid,**driver,'rating':number(maximum=5),'createdAt':date},['id','name','status','vehicle'])
schema('DriverStatusInput',{'status':driver['status']},['status'])
schema('DriverSelfStatusInput',{'status':string(enum=['AVAILABLE','OFFLINE'])},['status'])
schema('LocationInput',{'latitude':{'type':'number','minimum':-90,'maximum':90},'longitude':{'type':'number','minimum':-180,'maximum':180},'recordedAt':date},['latitude','longitude','recordedAt'])
schema('Delivery',{'id':uid,'orderId':uid,'driverId':uid,'status':string(enum=['ASSIGNED','ACCEPTED','PICKED_UP','ON_THE_WAY','DELIVERED','CANCELLED']),'pickupAddress':string(),'dropoffAddress':string(),'assignedAt':date,'deliveredAt':date},['id','orderId','driverId','status'])
schema('DeliveryStatusInput',{'status':string(enum=['ACCEPTED','PICKED_UP','ON_THE_WAY','DELIVERED']),'note':string()},['status'])
schema('Notification',{'id':uid,'type':string(),'title':string(),'body':string(),'isRead':boolean,'createdAt':date},['id','type','title','body','isRead'])
schema('NotificationInput',{'recipientIds':array(uid),'title':string(),'body':string(),'type':string(enum=['ORDER','DELIVERY','SYSTEM'])},['recipientIds','title','body','type'])
schema('DeviceInput',{'token':string(),'platform':string(enum=['ANDROID','IOS','WEB'])},['token','platform'])
schema('Dashboard',{'totalUsers':integer(),'totalRestaurants':integer(),'totalShops':integer(),'totalProducts':integer(),'totalOrders':integer(),'ordersToday':integer(),'ordersThisWeek':integer(),'ordersThisMonth':integer(),'totalRevenue':money,'activeDrivers':integer(),'availableDrivers':integer()},['totalUsers','totalRestaurants','totalShops','totalProducts','totalOrders','ordersToday','ordersThisWeek','ordersThisMonth','totalRevenue','activeDrivers','availableDrivers'])
schema('Statistics',{'orders':integer(),'completedOrders':integer(),'cancelledOrders':integer(),'revenue':money,'averageOrderValue':money,'cancellationRate':number(maximum=1),'averageDeliveryMinutes':number(),'newUsers':integer(),'activeRestaurants':integer(),'activeShops':integer(),'series':array(obj({'date':string(format='date'),'orders':integer(),'revenue':money,'newUsers':integer()},['date','orders','revenue','newUsers']))},['orders','revenue','series'])
schema('DriverStatistics',{'driverId':uid,'totalDeliveries':integer(),'todayDeliveries':integer(),'weekDeliveries':integer(),'monthDeliveries':integer(),'completed':integer(),'cancelled':integer(),'averageDeliveryMinutes':number(),'revenue':money,'rating':number(maximum=5),'series':array(obj({'date':string(format='date'),'deliveries':integer(),'revenue':money},['date','deliveries','revenue']))},['driverId','totalDeliveries','revenue','series'])
schema('RankingEntry',{'id':uid,'name':string(),'orders':integer(),'revenue':money},['id','name','orders','revenue'])
schema('Settings',{'platformName':string(example='Wasla'),'supportEmail':string(format='email'),'defaultDeliveryFee':money,'currency':string(enum=['TND']),'timezone':string(enum=['Africa/Tunis']),'cashOnDeliveryEnabled':{'type':'boolean','enum':[True]},'onlinePaymentsEnabled':{'type':'boolean','enum':[False]}},['platformName','defaultDeliveryFee','currency'])
schema('UploadResult',{'url':string(format='uri'),'key':string(),'mimeType':string(),'size':integer()},['url','key','mimeType','size'])
schema('Payment',{'id':uid,'orderId':uid,'method':string(enum=['CASH_ON_DELIVERY']),'amount':money,'status':string(enum=['UNPAID','PAID']),'collectedAt':date},['id','orderId','method','amount','status'])
schema('Health',{'status':string(enum=['ok','degraded']),'database':string(enum=['up','down']),'redis':string(enum=['up','down','disabled']),'timestamp':date},['status','database','redis','timestamp'])
P={}
tags={}
def param(name,where='query',typ=None,required=False,description=''):
 return {'name':name,'in':where,'required':required,'schema':typ or string(),'description':description}
pageparams=[param('page',typ=integer(minimum=1,default=1)),param('limit',typ=integer(minimum=1,maximum=100,default=20)),param('search',description='Recherche textuelle'),param('sort',description='Champ autorisé selon la ressource, par défaut createdAt'),param('order',typ=string(enum=['asc','desc'],default='desc'))]
period=[param('from',typ=string(format='date'),description='Début inclus, fuseau Africa/Tunis'),param('to',typ=string(format='date'),description='Fin incluse'),param('groupBy',typ=string(enum=['day','week','month'],default='day'))]
def response(model,desc='Succès'):
 return {'description':desc,**({'content':{'application/json':{'schema':ref(model) if isinstance(model,str) else model}}} if model else {})}
def operation(path,method,tag,title,model=None,body=None,roles=('ADMIN',),params=(),code=200,description='',public=False):
 tags.setdefault(tag,{'name':tag,'description':'Contrat prévu — endpoints non implémentés.'})
 op={'tags':[tag],'summary':title,'operationId':method+'_'+path.strip('/').replace('/','_').replace('{','').replace('}','').replace('-','_'),'description':'**PRÉVU — route non implémentée.** '+description+'\n\nAccès prévu : '+('public' if public else ', '.join(roles))+'.','x-implementation-status':'planned','x-required-roles':list(roles) if not public else [],'security':[] if public else [{'bearerAuth':[]}],'responses':{str(code):response(model,'Réponse contractuelle attendue (pas une réponse réelle)'),'400':response('Error','Validation invalide'),'401':response('Error','Authentification requise'),'403':response('Error','Permission ou propriété insuffisante'),'404':response('Error','Ressource introuvable'),'409':response('Error','Conflit de stock, état ou unicité'),'429':response('Error','Limite de requêtes atteinte'),'500':response('Error','Erreur interne')}}
 parameters=list(params)
 import re
 for name in re.findall(r'{([^}]+)}',path):parameters.insert(0,param(name,'path',uid,True,'Identifiant de la ressource'))
 if parameters:op['parameters']=parameters
 if body:op['requestBody']={'required':True,'content':{'application/json':{'schema':ref(body) if isinstance(body,str) else body}}}
 P.setdefault(path,{})[method]=op
 return op
def listing(path,tag,title,model,roles=('ADMIN',),public=False,extra=()):
 return operation(path,'get',tag,title,obj({'items':array(ref(model)),'total':integer(),'page':integer(minimum=1),'limit':integer(minimum=1)},['items','total','page','limit']),roles=roles,public=public,params=pageparams+list(extra))
def crud(path,tag,model,input_model,update_model,public_read=False):
 listing(path,tag,'Lister et rechercher',model,public=public_read)
 operation(path,'post',tag,'Créer',model,input_model,code=201)
 operation(path+'/{id}','get',tag,'Consulter le détail',model,public=public_read)
 operation(path+'/{id}','patch',tag,'Modifier',model,update_model)
 operation(path+'/{id}','delete',tag,'Archiver',code=204,description='Archivage logique ; préserve les commandes historiques.')
operation('/health','get','Health','État du backend','Health',public=True)
operation('/auth/register','post','Authentication','Créer un compte client','TokenPair','RegisterInput',code=201,public=True,description='Le rôle CUSTOMER est imposé par le serveur. Aucun rôle privilégié ne peut être choisi.')
operation('/auth/login','post','Authentication','Se connecter','TokenPair','LoginInput',public=True)
operation('/auth/refresh','post','Authentication','Renouveler les jetons','TokenPair','RefreshInput',public=True,description='Rotation du refresh token et révocation de l’ancien jeton.')
operation('/auth/logout','post','Authentication','Révoquer la session',body='RefreshInput',roles=('CUSTOMER','ADMIN','DRIVER','RESTAURANT_OWNER','SHOP_OWNER'),code=204)
operation('/auth/me','get','Authentication','Consulter la session','User',roles=('CUSTOMER','ADMIN','DRIVER','RESTAURANT_OWNER','SHOP_OWNER'))
operation('/auth/password','put','Authentication','Changer son mot de passe',body='PasswordChange',roles=('CUSTOMER','ADMIN','DRIVER','RESTAURANT_OWNER','SHOP_OWNER'),code=204)
operation('/auth/forgot-password','post','Authentication','Demander un lien de réinitialisation','Message','PasswordResetRequest',public=True,description='Réponse identique que le compte existe ou non.')
operation('/auth/reset-password','post','Authentication','Réinitialiser avec un jeton',body='PasswordReset',public=True,code=204)
listing('/users','Users','Lister les utilisateurs','User',extra=[param('role',typ=role)])
operation('/users/{id}','get','Users','Consulter un utilisateur','User')
operation('/users/{id}','patch','Users','Modifier un utilisateur','User','UserUpdate')
operation('/users/{id}/role','patch','Users','Modifier le rôle','User','RoleUpdate')
operation('/users/me','patch','Users','Modifier son profil','User','ProfileUpdate',roles=('CUSTOMER','ADMIN','DRIVER','RESTAURANT_OWNER','SHOP_OWNER'))
listing('/customers','Customers','Lister les clients','User')
operation('/customers/{id}','get','Customers','Consulter un client','User')
listing('/customers/{id}/orders','Customers','Commandes du client','Order')
for path,tag in [('/restaurants','Restaurants'),('/shops','Shops')]:
 crud(path,tag,'Merchant','MerchantInput','MerchantUpdate',True)
 operation(path+'/{id}/availability','patch',tag,'Activer ou ouvrir le commerce','Merchant','AvailabilityInput')
 operation(path+'/{id}/opening-hours','get',tag,'Consulter les horaires','OpeningHoursInput',public=True)
 operation(path+'/{id}/opening-hours','put',tag,'Définir les horaires','OpeningHoursInput','OpeningHoursInput')
 listing(path+'/{id}/products',tag,'Consulter les produits du commerce','Product',public=True,extra=[param('categoryId',typ=uid)])
 listing(path+'/{id}/orders',tag,'Consulter les commandes du commerce','Order',roles=('ADMIN','RESTAURANT_OWNER' if tag=='Restaurants' else 'SHOP_OWNER'))
 operation(path+'/{id}/statistics','get',tag,'Statistiques du commerce','Statistics',params=period)
crud('/categories','Categories','Category','CategoryInput','CategoryUpdate',True)
crud('/products','Products','Product','ProductInput','ProductUpdate',True)
operation('/products/{id}/stock','patch','Products','Modifier le stock','Product','StockInput',description='Écriture atomique, journalisée. Le stock ne peut pas devenir négatif.')
operation('/products/{id}/availability','patch','Products','Modifier la disponibilité','Product','ProductAvailability')
for plural,model in [('variants','Variant'),('options','Option')]:
 operation('/products/{id}/'+plural,'get','Product '+plural,'Lister '+plural,array(ref(model)),public=True)
 operation('/products/{id}/'+plural,'post','Product '+plural,'Ajouter '+plural,model,model+'Input',code=201)
 operation('/products/{id}/'+plural+'/{itemId}','put','Product '+plural,'Remplacer '+plural,model,model+'Input')
 operation('/products/{id}/'+plural+'/{itemId}','delete','Product '+plural,'Supprimer '+plural,code=204)
listing('/addresses','Addresses','Lister ses adresses','Address',roles=('CUSTOMER',))
operation('/addresses','post','Addresses','Ajouter une adresse','Address','AddressInput',roles=('CUSTOMER',),code=201)
operation('/addresses/{id}','patch','Addresses','Modifier son adresse','Address','AddressUpdate',roles=('CUSTOMER',))
operation('/addresses/{id}','delete','Addresses','Supprimer son adresse',roles=('CUSTOMER',),code=204)
operation('/cart','get','Cart','Lire son panier','Cart',roles=('CUSTOMER',))
operation('/cart/items','post','Cart','Ajouter un article','Cart','CartItemInput',roles=('CUSTOMER',),description='Un seul commerce par panier. Valider stock, produit actif, variante disponible et options obligatoires. Tous les prix sont calculés côté serveur.')
operation('/cart/items/{id}','patch','Cart','Changer la quantité','Cart','QuantityInput',roles=('CUSTOMER',))
operation('/cart/items/{id}','delete','Cart','Retirer un article','Cart',roles=('CUSTOMER',))
operation('/cart','delete','Cart','Vider son panier',roles=('CUSTOMER',),code=204)
operation('/orders','post','Orders','Commander le panier','Order','CreateOrderInput',roles=('CUSTOMER',),code=201,params=[param('Idempotency-Key','header',string(minLength=16),True,'Clé unique conservée lors des nouvelles tentatives')],description='Transaction : relire produits et tarifs, verrouiller et décrémenter le stock, figer les prix et l’adresse, créer la commande PENDING, vider le panier. Rejeu avec même clé et même contenu : retourne la même commande. Conflit de contenu : 409. Paiement en espèces uniquement.')
listing('/orders','Orders','Lister les commandes autorisées','Order',roles=('CUSTOMER','ADMIN','RESTAURANT_OWNER','SHOP_OWNER'),extra=[param('status',typ=status),param('merchantId',typ=uid)])
operation('/orders/{id}','get','Orders','Consulter une commande','Order',roles=('CUSTOMER','ADMIN','DRIVER','RESTAURANT_OWNER','SHOP_OWNER'),description='Accès strictement limité au client, commerce ou livreur associé, ou ADMIN.')
operation('/orders/{id}/status','patch','Orders','Faire avancer la commande','Order','OrderStatusInput',description='Transitions contrôlées. Une commande DELIVERED ou CANCELLED est terminale. Livreur obligatoire pour DRIVER_ASSIGNED et les étapes suivantes.')
operation('/orders/{id}/cancel','post','Orders','Annuler une commande','Order','CancelInput',roles=('CUSTOMER','ADMIN'),description='Le client peut annuler uniquement avant confirmation. Restaurer le stock une seule fois dans la transaction.')
operation('/orders/{id}/assign-driver','post','Orders','Assigner un livreur disponible','Order','AssignDriverInput',description='Commande prête uniquement ; vérifier AVAILABLE et réserver le livreur dans la même transaction.')
operation('/orders/{id}/tracking','get','Orders','Suivre sa commande','Tracking',roles=('CUSTOMER','ADMIN','DRIVER'))
crud('/drivers','Drivers','Driver','DriverInput','DriverUpdate')
operation('/drivers/{id}/status','patch','Drivers','Modifier le statut du livreur','Driver','DriverStatusInput')
operation('/drivers/{id}/reset-password','post','Drivers','Déclencher une réinitialisation','Message',description='Envoyer un lien à usage unique, ne jamais exposer le mot de passe.')
operation('/drivers/{id}/location','get','Drivers','Dernière position du livreur','LocationInput')
operation('/drivers/{id}/statistics','get','Drivers','Statistiques par livreur','DriverStatistics',params=period)
listing('/drivers/{id}/deliveries','Drivers','Historique des livraisons','Delivery')
operation('/drivers/me/status','patch','Driver app','Se rendre disponible ou hors ligne','Driver','DriverSelfStatusInput',roles=('DRIVER',),description='Interdire OFFLINE pendant une livraison active.')
operation('/drivers/me/location','put','Driver app','Mettre à jour sa position',body='LocationInput',roles=('DRIVER',),code=204)
operation('/drivers/me/statistics','get','Driver app','Mes statistiques','DriverStatistics',roles=('DRIVER',),params=period)
listing('/drivers/me/deliveries','Driver app','Mes missions','Delivery',roles=('DRIVER',))
listing('/deliveries','Deliveries','Lister les livraisons','Delivery',roles=('ADMIN','DRIVER'))
operation('/deliveries/{id}','get','Deliveries','Consulter une livraison','Delivery',roles=('ADMIN','DRIVER'))
operation('/deliveries/{id}/accept','post','Deliveries','Accepter sa mission','Delivery',roles=('DRIVER',))
operation('/deliveries/{id}/status','patch','Deliveries','Actualiser la livraison','Delivery','DeliveryStatusInput',roles=('ADMIN','DRIVER'),description='Synchroniser le statut de commande. Le livreur doit être celui assigné. Libérer le livreur après livraison et enregistrer l’encaissement en espèces.')
listing('/notifications','Notifications','Mes notifications','Notification',roles=('CUSTOMER','ADMIN','DRIVER','RESTAURANT_OWNER','SHOP_OWNER'))
operation('/notifications/{id}/read','patch','Notifications','Marquer comme lue','Notification',roles=('CUSTOMER','ADMIN','DRIVER','RESTAURANT_OWNER','SHOP_OWNER'))
operation('/notifications/read-all','post','Notifications','Tout marquer comme lu',roles=('CUSTOMER','ADMIN','DRIVER','RESTAURANT_OWNER','SHOP_OWNER'),code=204)
operation('/notifications','post','Notifications','Créer une notification','Message','NotificationInput',code=202)
operation('/notifications/devices','post','Notifications','Enregistrer un appareil push','Message','DeviceInput',roles=('CUSTOMER','ADMIN','DRIVER'),code=201)
operation('/admin/dashboard','get','Admin & Statistics','Tous les KPI du dashboard','Dashboard',description='Revenus = commandes livrées. Périodes calendaires dans Africa/Tunis.')
operation('/statistics','get','Admin & Statistics','Statistiques globales et séries','Statistics',params=period)
for name in ['restaurants','shops','products','drivers']:
 operation('/statistics/top-'+name,'get','Admin & Statistics','Classement '+name,array(ref('RankingEntry')),params=period+[param('limit',typ=integer(minimum=1,maximum=100,default=10))])
operation('/settings','get','Settings','Consulter les paramètres','Settings')
operation('/settings','put','Settings','Enregistrer les paramètres','Settings','Settings',description='Les frais modifiés ne changent pas les commandes existantes.')
upload=operation('/uploads','post','Storage','Uploader une image','UploadResult',code=201,description='Images JPEG, PNG ou WebP uniquement ; maximum 5 Mo ; vérifier le contenu et générer la clé côté serveur.')
upload['requestBody']={'required':True,'content':{'multipart/form-data':{'schema':obj({'file':string(format='binary')},['file'])}}}
operation('/payments/order/{id}','get','Payments (cash V1)','État du paiement en espèces','Payment',roles=('CUSTOMER','ADMIN'),description='Aucun endpoint de paiement en ligne dans la V1.')
operation('/payments/order/{id}/collect','post','Payments (cash V1)','Enregistrer les espèces reçues','Payment',roles=('ADMIN','DRIVER'),description='Livraison terminée et livreur assigné uniquement. Action idempotente, montant lu depuis la commande.')
spec={'openapi':'3.0.3','info':{'title':'Wasla — Contrat API V1','version':'0.1.0-draft','description':'Documentation du backend à construire. **Toutes les opérations ci-dessous sont PRÉVUES et non implémentées.** Le site actuel fonctionne avec des données locales dans le navigateur. Swagger ne prouve pas qu’un serveur existe. Les boutons d’exécution sont désactivés pour éviter de présenter ces contrats comme des API fonctionnelles.\n\nMontants en TND ; dates ISO 8601 ; calendrier Africa/Tunis. Validation, permissions et contrôles de stock à implémenter côté serveur.'},'servers':[{'url':'/api/v1','description':'Base cible — backend non connecté'}],'tags':list(tags.values()),'paths':P,'components':{'securitySchemes':{'bearerAuth':{'type':'http','scheme':'bearer','bearerFormat':'JWT','description':'JWT fourni par le futur backend après connexion. Aucun jeton réel nécessaire pour consulter cette documentation.'}},'schemas':S}}
for path in [Path('api/planned-openapi.json')]:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
print(f'{sum(len(v) for v in P.values())} opérations, {len(P)} chemins, {len(S)} schémas')
