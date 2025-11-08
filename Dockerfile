# 使用一个轻量级的 nginx 镜像作为基础
FROM nginx:alpine

# 将项目中的所有文件复制到 nginx 的网站根目录
COPY . /usr/share/nginx/html

# 暴露 80 端口，以便外部可以访问
EXPOSE 80

# nginx 基础镜像会默认启动服务器