#Mnemósine - Backend de Seguridad y Trazabilidad

Mnemósine es una plataforma backend de ciberseguridad diseñada para proteger portafolios digitales de creadores visuales contra el scraping no autorizado por parte de bots de Inteligencia Artificial. Utiliza auditoría de tráfico en tiempo real y simulación de inyección esteganográfica.

##Arquitectura del Sistema (Flujo ETL)

El sistema está construido bajo una arquitectura desacoplada de 4 capas para garantizar alta concurrencia y tolerancia a fallos:

1. Capa de Entrada (API REST): Construida con Express.js. Actúa como escudo inicial, interceptando peticiones y enviándolas a las colas de procesamiento sin bloquear el Hilo Principal (Event Loop).
2. Capa de Mensajería (Broker): Utiliza Redis y BullMQ como buffer de memoria. Absorbe picos de tráfico masivo (Rate Limiting) y encola los trabajos de forma asíncrona.
3. Capa de Lógica (Workers): Procesos en segundo plano (Patrón ETL) que extraen la data de Redis, aplican reglas de transformación (detección de bots basados en `User-Agent` e IPs) y simulan la inyección de marcas de agua esteganográficas.
4. Capa de Almacenamiento (NoSQL): Implementada con MongoDB y Mongoose. Permite flexibilidad estructural para registrar metadatos evolutivos de las obras y esquemas dinámicos para los logs de auditoría.

##Características Principales
 Escudo Anti-Scraping: Identificación y mitigación de tráfico anómalo mediante análisis de cabeceras.
 Inteligencia de Amenazas (Dashboard): Interfaz web integrada en tiempo real que consume el Aggregation Framework de MongoDB (`$facet`, `$group`, `$match`) para calcular estadísticas de seguridad sin requerir consultas SQL complejas.
 Bóveda de Obras: Registro asíncrono de obras de arte con generación de hash rastreable.

##Tecnologías Utilizadas
 Entorno: Node.js v18+
 Base de Datos: MongoDB (NoSQL)
 Cola en Memoria: Redis (v6.0+)
 Dependencias Core: Express, BullMQ, Mongoose
 Frontend (Dashboard): HTML5, Vanilla JS, Tailwind CSS (CDN)

##Instalación y Configuración (Entorno Local)

1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/Irina-mhz/Mnem-sine.git](https://github.com/Irina-mhz/Mnem-sine.git)
   cd mnemosine-backend
