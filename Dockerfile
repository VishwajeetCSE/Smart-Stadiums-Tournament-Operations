FROM nginx:alpine

# Copy static frontend files to Nginx public folder
COPY ./frontend /usr/share/nginx/html

# Copy Nginx custom configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (Cloud Run expectation)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
