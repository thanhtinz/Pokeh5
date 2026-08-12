# PHP-FPM with just what the portal needs. The release ran on whatever the
# `常用环境.exe` bundle installed; pinning it here means the same behaviour on
# every machine.
FROM php:8.3-fpm-alpine

RUN docker-php-ext-install pdo_mysql \
    && docker-php-ext-enable pdo_mysql

# The portal is mounted read-only; PHP never needs to write into it. Sessions
# go to a tmpfs-backed directory owned by the runtime user.
RUN mkdir -p /var/lib/php/sessions \
    && chown www-data:www-data /var/lib/php/sessions

COPY php.ini /usr/local/etc/php/conf.d/portal.ini

WORKDIR /var/www/portal
