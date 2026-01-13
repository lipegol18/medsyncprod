import * as fsp from "fs/promises";
import { spawn } from "child_process";

/**
 * Limites de recursos do ImageMagick para proteção contra PDF "bomba"
 * Previne consumo excessivo de RAM/CPU por PDFs maliciosos
 */
const IMAGEMAGICK_LIMITS = [
  "-limit", "memory", "512MiB",
  "-limit", "map", "1GiB",
  "-limit", "area", "256MiB",
  "-limit", "disk", "2GiB",
  "-limit", "time", "60",
];

/**
 * Executa o comando convert do ImageMagick de forma segura usando spawn
 * @param args Array de argumentos para o comando convert
 * @returns Promise que resolve quando o comando termina com sucesso
 */
async function runConvert(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const convertProcess = spawn("convert", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    convertProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    convertProcess.on("error", (error) => {
      reject(new Error(`Falha ao executar ImageMagick: ${error.message}`));
    });

    convertProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ImageMagick convert falhou (code ${code}): ${stderr}`));
      }
    });
  });
}

/**
 * Converte a primeira página de um PDF para imagem PNG
 * Usa ImageMagick (convert) para a conversão
 *
 * @param pdfPath Caminho do arquivo PDF
 * @returns Buffer da imagem convertida
 */
export async function convertPDFToImage(pdfPath: string): Promise<Buffer> {
  const outputPath = `${pdfPath}.png`;

  try {
    console.log("📄 [PDF-Converter] Iniciando conversão de PDF para imagem...");
    console.log("📄 [PDF-Converter] Arquivo de entrada:", pdfPath);

    await runConvert([
      ...IMAGEMAGICK_LIMITS,
      "-density", "300",
      `${pdfPath}[0]`,
      "-background", "white",
      "-alpha", "remove",
      "-alpha", "off",
      "-flatten",
      "-colorspace", "sRGB",
      "-strip",
      "-resize", "2000x2000>",
      "-sharpen", "0x0.8",
      "-contrast-stretch", "0.5%x0.5%",
      "-quality", "95",
      outputPath,
    ]);

    console.log("✅ [PDF-Converter] Conversão concluída com sucesso");

    const imageBuffer = await fsp.readFile(outputPath);
    console.log(
      "📄 [PDF-Converter] Tamanho da imagem:",
      imageBuffer.length,
      "bytes",
    );

    await fsp.unlink(outputPath).catch(() => {});
    console.log("🧹 [PDF-Converter] Arquivo temporário removido");

    return imageBuffer;
  } catch (error) {
    console.error("❌ [PDF-Converter] Erro na conversão:", error);

    await fsp.unlink(outputPath).catch(() => {});

    throw new Error(
      `Erro na conversão PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    );
  }
}
