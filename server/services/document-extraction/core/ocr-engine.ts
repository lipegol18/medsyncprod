import { ImageAnnotatorClient } from "@google-cloud/vision";
import * as fs from "fs";
import { FlowDebugger } from "../utils/flow-debugger";

/**
 * Passo 1: Extração de texto via Google Vision API
 * Esta classe encapsula toda a lógica de comunicação com o Google Vision
 */
export class GoogleVisionOCREngine {
  private client: ImageAnnotatorClient;

  constructor() {
    this.client = this.createVisionClient();
  }

  /**
   * Extrai texto de uma imagem usando Google Vision API
   * @param imageBuffer Buffer da imagem
   * @returns Promise<string> Texto extraído
   */
  async extractText(imageBuffer: Buffer): Promise<string> {
    FlowDebugger.enter("ocr-engine.ts", "extractText", {
      bufferSize: imageBuffer.length,
    });

    try {
      console.log("🔍 Iniciando extração de texto com Google Vision API...");

      FlowDebugger.data(
        "ocr-engine.ts",
        "extractText",
        "Chamando Google Vision API",
        "textDetection",
      );
      const [result] = await this.client.textDetection({
        image: {
          content: imageBuffer,
        },
      });

      const detections = result.textAnnotations;
      FlowDebugger.data("ocr-engine.ts", "extractText", "Detecções recebidas", {
        count: detections?.length || 0,
      });

      if (!detections || detections.length === 0) {
        FlowDebugger.data(
          "ocr-engine.ts",
          "extractText",
          "Resultado",
          "Nenhum texto detectado",
        );
        console.log("⚠️ Nenhum texto detectado na imagem");
        FlowDebugger.exit("ocr-engine.ts", "extractText", "");
        return "";
      }

      const extractedText = detections[0]?.description || "";
      FlowDebugger.data("ocr-engine.ts", "extractText", "Texto extraído", {
        length: extractedText.length,
        preview: extractedText.substring(0, 100),
      });
      console.log("✅ Texto extraído com sucesso");
      console.log("📝 Tamanho do texto:", extractedText.length, "caracteres");

      FlowDebugger.exit("ocr-engine.ts", "extractText", {
        textLength: extractedText.length,
      });
      return extractedText;
    } catch (error) {
      FlowDebugger.error("ocr-engine.ts", "extractText", error);
      console.error("❌ Erro na extração de texto:", error);
      throw new Error(`Falha na extração de texto: ${error}`);
    }
  }

  /**
   * Configura cliente do Google Vision com as credenciais
   * Prioridade:
   * 1. GOOGLE_VISION_CREDENTIALS (nova variável específica)
   * 2. GOOGLE_APPLICATION_CREDENTIALS (variável padrão do Google)
   */
  private createVisionClient(): ImageAnnotatorClient {
    // Priorizar GOOGLE_VISION_CREDENTIALS (nova, específica para este serviço)
    // Isso permite sobrescrever a variável legada que pode estar cacheada no Replit
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const credentialSource = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      ? "GOOGLE_APPLICATION_CREDENTIALS_JSON"
      : "GOOGLE_APPLICATION_CREDENTIALS";

    console.log(
      "🔐 [OCR-Engine] Verificando credenciais do Google Cloud Vision...",
    );
    console.log("🔐 [OCR-Engine] Fonte da credencial:", credentialSource);

    if (!credentials) {
      console.error(
        "❌ [OCR-Engine] Nenhuma credencial encontrada (GOOGLE_APPLICATION_CREDENTIALS_JSON",
      );
      throw new Error(
        "❌ Credenciais do Google Cloud não encontradas. Configure GOOGLE_APPLICATION_CREDENTIALS_JSON nos Secrets.",
      );
    }

    console.log(
      "🔐 [OCR-Engine] Credenciais encontradas, tipo:",
      credentials.startsWith("{") ? "JSON inline" : "Caminho de arquivo",
    );
    console.log(
      "🔐 [OCR-Engine] Tamanho das credenciais:",
      credentials.length,
      "caracteres",
    );

    // Se as credenciais são JSON, criar arquivo temporário
    if (credentials.startsWith("{")) {
      try {
        // Validar se é JSON válido
        const parsed = JSON.parse(credentials);
        console.log(
          "🔐 [OCR-Engine] JSON válido, project_id:",
          parsed.project_id || "N/A",
        );
        console.log(
          "🔐 [OCR-Engine] client_email:",
          parsed.client_email || "N/A",
        );
        console.log(
          "🔐 [OCR-Engine] private_key_id:",
          parsed.private_key_id || "N/A",
        );

        const tempPath = "/tmp/google-credentials.json";
        fs.writeFileSync(tempPath, credentials);
        console.log("🔐 [OCR-Engine] Arquivo temporário criado em:", tempPath);

        return new ImageAnnotatorClient({
          keyFilename: tempPath,
        });
      } catch (parseError) {
        console.error(
          "❌ [OCR-Engine] Erro ao parsear JSON das credenciais:",
          parseError,
        );
        throw new Error(
          "❌ Credenciais do Google Cloud inválidas (JSON malformado)",
        );
      }
    }

    // Se é um caminho de arquivo, usar diretamente
    console.log("🔐 [OCR-Engine] Usando caminho de arquivo:", credentials);
    if (!fs.existsSync(credentials)) {
      console.error(
        "❌ [OCR-Engine] Arquivo de credenciais não encontrado:",
        credentials,
      );
      throw new Error(
        "❌ Arquivo de credenciais do Google Cloud não encontrado",
      );
    }

    return new ImageAnnotatorClient({
      keyFilename: credentials,
    });
  }
}
