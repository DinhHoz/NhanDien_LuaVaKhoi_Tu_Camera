# Cameras API

API quản lý camera cho từng người dùng. Tất cả endpoint đều yêu cầu xác thực bằng Firebase Token (`Authorization: Bearer <token>`).

---

## Lấy danh sách camera

**GET** `/cameras`

### Headers

- `Authorization: Bearer <token>`

### Response 200 (GET)

```json
[
  {
    "id": "abc123",
    "cameraName": "Camera 1",
    "streamUrl": "rtsp://192.168.1.10/live",
    "location": "Factory Entrance",
    "status": "active",
    "createdAt": "2025-09-12T10:00:00.000Z"
  }
]
```

---

## Thêm mới camera

**POST** `/cameras`

### Headers(GET)

- `Authorization: Bearer <token>`

### Body (GET)

```json
{
  "cameraName": "Camera 1",
  "streamUrl": "rtsp://192.168.1.10/live",
  "location": "Factory Entrance",
  "status": "active"
}
```

### Response 200

```json
{
  "id": "abc123"
}
```

---

## Cập nhật camera theo ID

**PUT** `/cameras/:cameraId`

### Headers(PUT)

- `Authorization: Bearer <token>`

### Params

- `cameraId`: ID của camera cần cập nhật.

### Body(PUT)

```json
{
  "cameraName": "Camera 1 Updated",
  "streamUrl": "rtsp://192.168.1.20/live",
  "location": "Warehouse",
  "status": "inactive"
}
```

### Response 200(PUT)

```json
{
  "id": "abc123",
  "message": "Camera updated successfully"
}
```

---

## Xoá camera theo ID

**DELETE** `/cameras/:cameraId`

### Headers (DELETE)

- `Authorization: Bearer <token>`

### Params (DELETE)

- `cameraId`: ID của camera cần xoá.

### Response 200(DELETE)

```json
{
  "id": "abc123",
  "message": "Camera deleted successfully"
}
```
