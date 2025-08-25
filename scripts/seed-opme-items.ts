import { db } from "../server/db";
import { opmeItems } from "../shared/schema";

async function seedOpmeItems() {
  console.log("Iniciando a importação de itens OPME...");

  try {
    // Verificar se já existem itens OPME
    const result = await db.select().from(opmeItems);
    if (result.length > 0) {
      console.log(`Já existem ${result.length} itens OPME no banco de dados.`);
      console.log("Pulando a importação para evitar duplicação.");
      return;
    }

    // Dados de exemplo para itens OPME
    const opmeItemsData = [
      {
        anvisaRegistrationNumber: "10380700077",
        processNumber: "25351.144193/2020-28",
        technicalName: "PLACA BLOQUEADA DE TITÂNIO PARA FIXAÇÃO DE OSSOS",
        commercialName: "SISTEMA DE PLACAS BLOQUEADAS TARGON",
        riskClass: "III",
        holderCnpj: "01.618.707/0001-01",
        registrationHolder: "B. BRAUN BRASIL LTDA",
        manufacturerName: "AESCULAP AG",
        countryOfManufacture: "ALEMANHA",
        registrationDate: "2020-07-27",
        expirationDate: "2030-07-27",
        isValid: true
      },
      {
        anvisaRegistrationNumber: "10380700180",
        processNumber: "25351.328759/2019-49",
        technicalName: "PARAFUSO ÓSSEO NÃO ABSORVÍVEL",
        commercialName: "PARAFUSOS ÓSSEOS AESCULAP",
        riskClass: "III",
        holderCnpj: "01.618.707/0001-01",
        registrationHolder: "B. BRAUN BRASIL LTDA",
        manufacturerName: "AESCULAP AG",
        countryOfManufacture: "ALEMANHA",
        registrationDate: "2019-11-13",
        expirationDate: "2029-11-13",
        isValid: true
      },
      {
        anvisaRegistrationNumber: "80145901520",
        processNumber: "25351.323745/2022-75",
        technicalName: "PRÓTESE TOTAL DE QUADRIL",
        commercialName: "SISTEMA ACETABULAR TRILOGY",
        riskClass: "IV",
        holderCnpj: "01.645.409/0001-78",
        registrationHolder: "ZIMMER BIOMET BRASIL LTDA.",
        manufacturerName: "ZIMMER, INC.",
        countryOfManufacture: "ESTADOS UNIDOS",
        registrationDate: "2022-09-18",
        expirationDate: "2032-09-18",
        isValid: true
      },
      {
        anvisaRegistrationNumber: "10223710073",
        processNumber: "25351.206044/2021-21",
        technicalName: "PLACA CERVICAL",
        commercialName: "SISTEMA ATLANTIS VISION ELITE",
        riskClass: "III",
        holderCnpj: "33.158.874/0001-54",
        registrationHolder: "MEDTRONIC COMERCIAL LTDA",
        manufacturerName: "MEDTRONIC SOFAMOR DANEK",
        countryOfManufacture: "ESTADOS UNIDOS",
        registrationDate: "2021-08-05",
        expirationDate: "2031-08-05",
        isValid: true
      },
      {
        anvisaRegistrationNumber: "10247899008",
        processNumber: "25351.248197/2023-34",
        technicalName: "HASTE INTRAMEDULAR",
        commercialName: "SISTEMA DE HASTE FEMORAL T2",
        riskClass: "III",
        holderCnpj: "02.340.250/0001-22",
        registrationHolder: "STRYKER DO BRASIL LTDA",
        manufacturerName: "STRYKER TRAUMA GMBH",
        countryOfManufacture: "ALEMANHA",
        registrationDate: "2023-06-12",
        expirationDate: "2033-06-12",
        isValid: true
      },
      {
        anvisaRegistrationNumber: "80858840019",
        processNumber: "25351.186452/2020-45",
        technicalName: "PRÓTESE TOTAL DE JOELHO",
        commercialName: "SISTEMA DE JOELHO COLUMBUS",
        riskClass: "IV",
        holderCnpj: "10.493.818/0001-33",
        registrationHolder: "MERIL LIFE SCIENCES DO BRASIL",
        manufacturerName: "MERIL LIFE SCIENCES PVT. LTD.",
        countryOfManufacture: "ÍNDIA",
        registrationDate: "2021-01-22",
        expirationDate: "2031-01-22",
        isValid: true
      }
    ];

    // Inserir dados
    await db.insert(opmeItems).values(opmeItemsData);

    console.log(`${opmeItemsData.length} itens OPME foram inseridos com sucesso!`);
  } catch (error) {
    console.error("Erro durante a importação de itens OPME:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seedOpmeItems();