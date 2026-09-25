// Adds sample restaurants, shops, categories, products and drivers to the current database.
// Safe to re-run: records whose id already exists are left untouched.
// Usage: npm run db:seed-catalog
import {connectDatabase} from './database.mjs';
import {snapshot, saveSnapshot} from './storage.mjs';

const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// [id, name, detail, image, phone, open, close, categories]
// category: [slug, name, department|undefined, products]
// product: [name, price DT, description, variants?]
const merchants = [
  ['restaurant-mamma-chami', 'Mamma Chami', 'Cuisine tunisienne traditionnelle · Monastir', '/images/restaurants/mamma-chami.jpeg', '+216 73 000 101', '11:00', '23:00', [
    ['plats', 'Plats tunisiens', undefined, [
      ['Couscous poulet', 22, 'Semoule fine, légumes de saison et poulet fermier.'],
      ['Couscous poisson', 26, 'Semoule, sauce relevée et poisson du jour.'],
      ['Ojja merguez', 18, 'Œufs, sauce tomate piquante et merguez maison.'],
      ['Lablabi', 9, 'Pois chiches, pain, cumin, harissa et huile d’olive.'],
    ]],
    ['entrees', 'Entrées', undefined, [
      ['Brik à l’œuf', 5, 'Feuille de malsouka croustillante, œuf, thon et persil.'],
      ['Salade tunisienne', 8, 'Tomates, concombre, oignon, thon et olives.'],
      ['Chorba frik', 7, 'Soupe traditionnelle au blé vert et à l’agneau.'],
    ]],
    ['desserts', 'Desserts', undefined, [
      ['Bouza', 6, 'Crème de sorgho parfumée, noisettes.'],
      ['Assida zgougou', 8, 'Crème de pin d’Alep, fruits secs.'],
    ]],
  ]],
  ['restaurant-o-pizza', 'O’Pizza', 'Pizzas au feu de bois · Monastir', '/images/restaurants/o-pizza.jpeg', '+216 73 000 102', '11:30', '00:00', [
    ['pizzas', 'Pizzas', undefined, [
      ['Pizza Margherita', 12, 'Sauce tomate, mozzarella et basilic.', true],
      ['Pizza Thon', 15, 'Sauce tomate, mozzarella, thon, olives et oignons.', true],
      ['Pizza 4 Fromages', 17, 'Mozzarella, emmental, gorgonzola et parmesan.', true],
      ['Pizza Neptune', 18, 'Thon, fruits de mer, mozzarella et persil.', true],
    ]],
    ['calzones', 'Calzones', undefined, [
      ['Calzone poulet', 15, 'Poulet mariné, champignons et mozzarella.'],
      ['Calzone viande hachée', 16, 'Viande hachée, poivrons et mozzarella.'],
    ]],
  ]],
  ['restaurant-mix-max-food', 'Mix Max Food', 'Burgers, sandwichs et fast-food · Monastir', '/images/restaurants/mix-max-food.jpeg', '+216 73 000 103', '11:00', '01:00', [
    ['burgers', 'Burgers', undefined, [
      ['Burger classique', 13, 'Steak haché, cheddar, salade, tomate et sauce maison.'],
      ['Double cheese burger', 18, 'Deux steaks, double cheddar, oignons caramélisés.'],
      ['Chicken burger', 14, 'Filet de poulet pané, salade et sauce blanche.'],
    ]],
    ['sandwichs', 'Sandwichs & Tacos', undefined, [
      ['Tacos poulet', 14, 'Poulet, frites, sauce fromagère.'],
      ['Sandwich escalope', 9, 'Escalope grillée, salade, harissa.'],
      ['Makloub', 10, 'Pain maison, poulet, fromage et frites.'],
    ]],
    ['accompagnements', 'Accompagnements', undefined, [
      ['Frites maison', 5, 'Pommes de terre fraîches, coupées à la main.'],
      ['Nuggets (8 pièces)', 9, 'Poulet pané, sauce au choix.'],
    ]],
  ]],
  ['restaurant-piri-piri', 'Piri’Piri', 'Poulet grillé et grillades · Monastir', '/images/restaurants/piri-piri.jpeg', '+216 73 000 104', '12:00', '23:30', [
    ['grillades', 'Grillades', undefined, [
      ['Demi poulet piri-piri', 17, 'Mariné au piment piri-piri, grillé au charbon.'],
      ['Poulet entier piri-piri', 30, 'Pour 2 à 3 personnes, frites et salade.'],
      ['Brochettes de poulet', 14, 'Trois brochettes marinées, riz ou frites.'],
    ]],
    ['assiettes', 'Assiettes', undefined, [
      ['Assiette escalope grillée', 16, 'Escalope, riz, frites et salade.'],
      ['Salade César au poulet', 12, 'Romaine, poulet grillé, parmesan et croûtons.'],
    ]],
  ]],
  ['shop-boissons-monastir', 'Boissons Express', 'Boissons fraîches et jus pressés · Monastir', '/images/departments/drinks.jpg', '+216 73 000 105', '08:00', '23:00', [
    ['jus', 'Jus frais', 'drinks', [
      ['Jus d’orange frais (1 L)', 7, 'Oranges de Menzel Bouzelfa pressées du jour.'],
      ['Jus de fraise (1 L)', 8, 'Fraises fraîches mixées, peu sucré.'],
      ['Citronnade maison (1 L)', 5, 'Citron, menthe fraîche et zeste.'],
    ]],
    ['boissons', 'Boissons', 'drinks', [
      ['Eau minérale 1,5 L', 1.2, 'Pack individuel, bien fraîche.'],
      ['Boisson gazeuse 1 L', 2.8, 'Cola, orange ou citron.'],
      ['Thé à la menthe', 3, 'Thé vert, menthe fraîche et pignons.'],
    ]],
  ]],
  ['shop-poissonnerie-monastir', 'Poissonnerie du Port', 'Poissons et fruits de mer du port de Monastir', '/images/departments/fish.jpg', '+216 73 000 106', '07:00', '14:00', [
    ['poissons', 'Poissons frais', 'fish', [
      ['Daurade (1 kg)', 32, 'Pêche du jour, vidée et écaillée sur demande.'],
      ['Loup de mer (1 kg)', 35, 'Pêche du jour, vidé et écaillé sur demande.'],
      ['Sardines (1 kg)', 8, 'Idéales grillées ou en chermoula.'],
    ]],
    ['fruits-de-mer', 'Fruits de mer', 'fish', [
      ['Crevettes royales (500 g)', 28, 'Crevettes fraîches, calibre moyen.'],
      ['Calamars (1 kg)', 30, 'Nettoyés, prêts à cuire.'],
    ]],
  ]],
  ['shop-verger-monastir', 'Le Verger de Monastir', 'Fruits, légumes et fruits secs · Monastir', '/images/departments/produce.jpg', '+216 73 000 107', '07:30', '20:00', [
    ['fruits', 'Fruits', 'produce', [
      ['Oranges (1 kg)', 3.5, 'Maltaises, douces et juteuses.'],
      ['Pommes (1 kg)', 5, 'Pommes rouges croquantes.'],
      ['Bananes (1 kg)', 6.5, 'Mûres à point.'],
    ]],
    ['legumes', 'Légumes', 'produce', [
      ['Tomates (1 kg)', 2.2, 'Tomates du Sahel.'],
      ['Pommes de terre (1 kg)', 1.8, 'Idéales pour frites et purée.'],
      ['Piments verts (500 g)', 2, 'Piments doux pour mechouia.'],
    ]],
    ['fruits-secs', 'Fruits secs', 'nuts', [
      ['Amandes (500 g)', 18, 'Amandes décortiquées, nature.'],
      ['Pistaches grillées (250 g)', 14, 'Grillées et légèrement salées.'],
      ['Dattes Deglet Nour (1 kg)', 12, 'Dattes de Tozeur en branches.'],
    ]],
  ]],
  ['shop-volailles-sahel', 'Volailles du Sahel', 'Poulet fermier et découpes · Monastir', '/images/departments/chicken.jpg', '+216 73 000 108', '08:00', '19:00', [
    ['poulet', 'Poulet', 'chicken', [
      ['Poulet entier fermier (1,5 kg)', 16, 'Élevé en plein air dans le Sahel.'],
      ['Blancs de poulet (1 kg)', 19, 'Filets sans peau, prêts à cuisiner.'],
      ['Cuisses de poulet (1 kg)', 12, 'Cuisses entières.'],
      ['Escalope de dinde (1 kg)', 22, 'Tranchée finement.'],
    ]],
  ]],
];

// [id, name, zone, vehicle, phone]
const drivers = [
  ['driver-mehdi-trabelsi', 'Mehdi Trabelsi', 'Centre-ville Monastir', 'Moto', '+216 22 000 101'],
];

const fr = (name, description, detail) => ({fr: {name, description, detail}});

const db = await connectDatabase();
await db.transaction(async tx => {
  await tx.query('SELECT id FROM app_state WHERE id=1 FOR UPDATE');
  const {data} = await snapshot(tx);
  const {restaurants, categories, products, departments} = data.catalog;
  const departmentIds = new Set(departments.map(d => d.id));
  const has = (list, id) => list.some(e => e.id === id);
  const added = {restaurants: 0, categories: 0, products: 0, drivers: 0};

  for (const [id, name, detail, image, phone, open, close, menu] of merchants) {
    if (!has(restaurants, id)) {
      restaurants.push({id, name, detail, image, phone, status: 'ACTIVE', value: 4.6, description: detail,
        scheduleDays: allDays, scheduleOpen: open, scheduleClose: close, translations: fr(name, detail, detail)});
      added.restaurants++;
    }
    for (const [slug, categoryName, department, items] of menu) {
      const categoryId = `${id}-${slug}`;
      if (!has(categories, categoryId)) {
        const category = {id: categoryId, name: categoryName, status: 'ACTIVE', detail: name, merchantId: id, merchant: name,
          value: categories.length + 1, translations: fr(categoryName, '', name)};
        if (department && departmentIds.has(department)) category.department = department;
        categories.push(category);
        added.categories++;
      }
      items.forEach(([productName, price, description, sizes], i) => {
        const productId = `${categoryId}-${i + 1}`;
        if (has(products, productId)) return;
        const product = {id: productId, name: productName, status: 'ACTIVE', detail: name, merchant: name, merchantId: id,
          categoryId, category: categoryName, value: price, stock: 50, description,
          image: department ? `/images/departments/${department}.jpg` : image,
          translations: fr(productName, description, name)};
        if (sizes) product.variants = [{id: 'standard', name: 'Classique', price: 0}, {id: 'large', name: 'Grande', price: 5}];
        products.push(product);
        added.products++;
      });
    }
  }

  for (const [id, name, zone, vehicle, phone] of drivers) {
    if (has(data.catalog.drivers, id)) continue;
    data.catalog.drivers.push({id, name, status: 'AVAILABLE', detail: zone, zone, vehicle, phone, value: 5});
    added.drivers++;
  }

  await saveSnapshot(tx, data);
  await tx.query('UPDATE app_state SET revision=revision+1 WHERE id=1');
  console.log(`Ajoutés : ${added.restaurants} commerce(s), ${added.categories} catégorie(s), ${added.products} produit(s), ${added.drivers} livreur(s).`);
});
await db.close();
