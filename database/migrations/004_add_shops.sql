-- ==============================================
-- Migration 004 : Boutiques vendeurs
-- Chaque vendeur crée explicitement SA boutique (1 par vendeur) après son
-- inscription ; les produits restent liés au vendeur (vendor_id), la boutique
-- est le profil public/marchand de ce vendeur.
-- ==============================================

CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_vendor ON shops(vendor_id);

-- Backfill : les vendeurs existants (démo) reçoivent leur boutique pour ne
-- pas casser les données déjà en place. Les nouveaux vendeurs passeront par
-- le parcours de création.
INSERT INTO shops (vendor_id, name, description)
SELECT
    u.id,
    CASE u.email
        WHEN 'techpro@novacart.com'     THEN 'TechPro'
        WHEN 'modeurbaine@novacart.com' THEN 'Mode Urbaine'
        WHEN 'maisondeco@novacart.com'  THEN 'Maison Déco'
        WHEN 'sportplus@novacart.com'   THEN 'Sport Plus'
        WHEN 'belleepoque@novacart.com' THEN 'Belle Époque'
        WHEN 'vendeur@platform.com'     THEN 'Boutique Démo'
        ELSE 'Boutique de ' || COALESCE(u.first_name, 'vendeur')
    END,
    CASE u.email
        WHEN 'techpro@novacart.com'     THEN 'High-tech et informatique au meilleur prix.'
        WHEN 'modeurbaine@novacart.com' THEN 'Mode et accessoires urbains.'
        WHEN 'maisondeco@novacart.com'  THEN 'Décoration et art de vivre.'
        WHEN 'sportplus@novacart.com'   THEN 'Équipement sport et plein air.'
        WHEN 'belleepoque@novacart.com' THEN 'Beauté et bien-être au naturel.'
        ELSE NULL
    END
FROM users u
WHERE u.role = 'vendeur'
  AND EXISTS (SELECT 1 FROM products p WHERE p.vendor_id = u.id)
ON CONFLICT (vendor_id) DO NOTHING;
