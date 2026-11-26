 Mnemósine - Plataforma de Seguridad, Esteganografía y Trazabilidad

Mnemósine es una plataforma backend y dashboard web de ciberseguridad diseñada para proteger portafolios digitales de creadores visuales contra el scraping no autorizado por parte de bots de Inteligencia Artificial. Combina auditoría de tráfico en tiempo real con inyección esteganográfica real a nivel de píxel.

 Arquitectura del Sistema (Flujo ETL)

El sistema opera bajo una arquitectura desacoplada de 4 capas para garantizar alta concurrencia y tolerancia a fallos:

1. Capa de Entrada (API REST): Construida con Express.js y `Multer`. Intercepta peticiones web, recibe archivos binarios de imagen y los encola sin bloquear el Event Loop.
2. Capa de Mensajería (Broker): Utiliza Redis y BullMQ como buffer en memoria para absorber picos de tráfico y gestionar trabajos asíncronos.
3. Capa de Lógica (Workers ETL): Procesos en segundo plano que extraen trabajos de Redis, ejecutan análisis de detección de bots y aplican esteganografía LSB (Least Significant Bit) real sobre los píxeles mediante `Jimp`, purgando automáticamente los archivos temporales del servidor.
4. Capa de Almacenamiento (NoSQL): Implementada con MongoDB y Mongoose para persistir metadatos evolutivos de las obras protegidas y logs dinámicos de auditoría.

 Características Principales
Inyección Esteganográfica Real (LSB): Modifica el bit menos significativo del canal rojo de cada píxel para incrustar una firma rastreable (`MNEMOSINE:<timestamp>:<hash>`) imperceptible al ojo humano, exportando el resultado en formato PNG sin pérdida.
Auditoría Forense en Navegador: Extractor integrado en el Dashboard mediante HTML5 `<canvas>` que lee los píxeles de cualquier imagen subida y decodifica en vivo su firma oculta.
Escudo Anti-Scraping e Inteligencia de Amenazas: Detección de bots maliciosos y generación de métricas en tiempo real utilizando el Aggregation Framework de MongoDB (`$facet`, `$group`, `$match`).
Bóveda de Obras Protegidas: Galería en tiempo real con vista previa y descarga directa de las obras firmadas.

 Tecnologías Utilizadas
Entorno: Node.js v18+
Base de Datos: MongoDB (NoSQL)
Cola en Memoria: Redis (v6.0+)
Dependencias Core: Express, BullMQ, Mongoose, Multer, Jimp
Frontend (Centro de Comando): HTML5, Vanilla JS (Canvas API), Tailwind CSS

 Instalación y Configuración (Entorno Local)

1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/Irina-mhz/Mnem-sine.git](https://github.com/Irina-mhz/Mnem-sine.git)
   cd mnemosine-backend

