#!/bin/bash
cd /var/www/codeforce
npm run build
pm2 restart codeforce --update-env

