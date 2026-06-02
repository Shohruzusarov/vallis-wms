# Vallis WMS — система контроля комплектации

## Быстрый деплой на Railway

### 1. Загрузить на GitHub
```bash
git init
git add .
git commit -m "Vallis WMS initial"
git remote add origin https://github.com/YOUR_USERNAME/vallis-wms.git
git push -u origin main
```

### 2. Деплой на Railway
1. Зайти на railway.app
2. New Project → Deploy from GitHub repo → выбрать vallis-wms
3. Add Plugin → PostgreSQL
4. В Variables добавить:
   - DATABASE_URL — скопировать из PostgreSQL плагина (Connect → DATABASE_URL)
   - NODE_ENV = production
   - JWT_SECRET = любая случайная строка

### 3. API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | /health | Проверка сервера |
| GET | /api/models | Список моделей |
| GET | /api/models/:id/parts | Детали модели |
| POST | /api/orders | Создать заказ |
| GET | /api/orders | Список заказов |
| GET | /api/orders/:id/kits/:num | Статус комплекта |
| POST | /api/scan | Отсканировать деталь |
| GET | /api/reports/order/:id | Отчёт по заказу |
| GET | /api/qr/part/:code | QR-код детали (PNG) |
| GET | /api/qr/model/:id/sheet | Лист QR-этикеток (HTML) |

### Пример сканирования
```json
POST /api/scan
{ "kit_id": 1, "part_code": "DC001F24-LID-W" }

Ответ OK:
{ "result": "ok", "part_name": "Крышка белая", "progress": 1, "total": 7 }

Ответ ЧУЖАЯ:
{ "result": "wrong", "message": "❌ ЧУЖАЯ ДЕТАЛЬ! ..." }
```
