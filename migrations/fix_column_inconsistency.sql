-- Certifique-se de que a coluna exam_image_url não existe e, se existir, corrija-a
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name='medical_orders' AND column_name='exam_image_url') THEN
        -- Se existir a coluna com nome errado (singular), renomeie para o plural
        ALTER TABLE "medical_orders" RENAME COLUMN "exam_image_url" TO "exam_images_url";
    END IF;
END $$;

-- Certifique-se de que a coluna exam_images_url existe e é do tipo array
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name='medical_orders' AND column_name='exam_images_url') THEN
        -- Se a coluna existir, certifique-se de que seja um array
        ALTER TABLE "medical_orders" ALTER COLUMN "exam_images_url" TYPE text[] USING 
            CASE 
                WHEN exam_images_url IS NULL THEN ARRAY[]::text[]
                WHEN exam_images_url::text = '{}' THEN ARRAY[]::text[]
                ELSE 
                    CASE 
                        WHEN array_ndims(exam_images_url::text[]) IS NULL THEN ARRAY[exam_images_url]::text[]
                        ELSE exam_images_url::text[] 
                    END
            END;
    ELSE
        -- Se a coluna não existir, crie-a
        ALTER TABLE "medical_orders" ADD COLUMN "exam_images_url" text[] DEFAULT ARRAY[]::text[];
    END IF;
END $$;