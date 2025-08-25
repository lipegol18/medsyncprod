-- Renomear a coluna para o formato correto (singular para plural)
ALTER TABLE "medical_orders" RENAME COLUMN "exam_image_url" TO "exam_images_url";

-- Alterar o tipo da coluna para array se ela ainda não for
ALTER TABLE "medical_orders" ALTER COLUMN "exam_images_url" TYPE text[] USING array[exam_images_url];

-- Adicionar uma coluna de contagem de imagens se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='medical_orders' AND column_name='exam_image_count') THEN
        ALTER TABLE "medical_orders" ADD COLUMN "exam_image_count" integer DEFAULT 0;
    END IF;
END $$;