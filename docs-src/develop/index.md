## 开发说明

### 目录结构
详见[目录结构](目录结构.md)

### 环境
1. node 要求大于v10.0.0，建议版本：v12.13.1

### 编译运行
```bash
  # 开发模式
  npm run dev # 编译并输出至2.x目录
  npm run dev -- -t 1.x # 编译并输出至1.x目录
  npm run dev -- -t 1.x,2.x # 编译并输出至1.x目录和2.x目录
  
  # 生产模式
  npm run build # 编译并输出至2.x目录
  npm run build -- -t 1.x # 编译并输出至1.x目录
  npm run build -- -t 1.x,2.x # 编译并输出至1.x目录和2.x目录
```

### 发布