# Servidor para PASALA CHE

Este es el servidor que proporciona la API para el ranking global del juego PASALA CHE.

## Instalación

Para instalar las dependencias, ejecuta:

```bash
cd server
npm install
```

## Ejecución

Para iniciar el servidor en modo desarrollo:

```bash
cd server
npm run dev
```

Para iniciar el servidor en producción:

```bash
cd server
npm start
```

## API Endpoints

### GET /api/ranking

Obtiene los datos del ranking global.

Parámetros:
- `period`: Período del ranking (global, monthly, weekly)

### POST /api/ranking/add

Añade una nueva entrada al ranking.

Cuerpo de la petición:
```json
{
  "name": "Nombre del jugador",
  "score": 100,
  "correct": 20,
  "wrong": 5,
  "difficulty": "normal",
  "date": "2025-03-28T15:30:00.000Z",
  "victory": true
}
```

## Datos

Los datos del ranking se almacenan en el archivo `data/rankingData.json`. 