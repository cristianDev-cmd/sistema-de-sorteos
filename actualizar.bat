@echo off
echo ==========================================
echo Actualizando proyecto en Cloudflare Pages
echo ==========================================
echo.
call npx wrangler pages deploy
echo.
echo ==========================================
echo ¡Despliegue finalizado con exito!
echo ==========================================
pause
