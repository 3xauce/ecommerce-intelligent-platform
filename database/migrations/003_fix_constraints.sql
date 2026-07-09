-- ==============================================
-- Migration 003 : Correction des contraintes d'intégrité
-- Ajoute ON DELETE CASCADE / SET NULL sur les clés étrangères
-- qui n'en avaient pas dans le schéma initial (001)
-- ==============================================

-- products : la suppression d'une catégorie ne doit pas être bloquée,
-- la suppression d'un vendeur doit supprimer ses produits
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_vendor_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_vendor_id_fkey
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE;

-- orders : conserver l'historique même si le client est supprimé
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL;

-- order_items : supprimés avec leur commande
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- competitor_stores : supprimés avec leur vendeur
ALTER TABLE competitor_stores DROP CONSTRAINT IF EXISTS competitor_stores_vendor_id_fkey;
ALTER TABLE competitor_stores ADD CONSTRAINT competitor_stores_vendor_id_fkey
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE;

-- scraped_products : supprimés avec leur store concurrent
ALTER TABLE scraped_products DROP CONSTRAINT IF EXISTS scraped_products_store_id_fkey;
ALTER TABLE scraped_products ADD CONSTRAINT scraped_products_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES competitor_stores(id) ON DELETE CASCADE;

-- alerts : supprimées avec leur vendeur
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_vendor_id_fkey;
ALTER TABLE alerts ADD CONSTRAINT alerts_vendor_id_fkey
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE;

-- predictions : supprimées avec leur produit
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_product_id_fkey;
ALTER TABLE predictions ADD CONSTRAINT predictions_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- carts / cart_items / refresh_tokens / password_reset_tokens / notifications / reports :
-- toujours liés à un utilisateur, doivent disparaître avec lui
ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_user_id_fkey;
ALTER TABLE carts ADD CONSTRAINT carts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_fkey;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_cart_id_fkey
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE;

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_vendor_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_vendor_id_fkey
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE;
