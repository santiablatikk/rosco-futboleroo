#!/bin/bash

# Script para comprimir recursos estáticos para PASALA CHE
# Usa gzip y brotli para optimizar la carga del sitio

echo "=== Iniciando compresión de recursos estáticos de PASALA CHE ==="

# Verificando si las herramientas necesarias están instaladas
if ! command -v gzip &> /dev/null; then
  echo "Error: gzip no está instalado. Por favor instálalo antes de continuar."
  exit 1
fi

if ! command -v brotli &> /dev/null; then
  echo "¿Brotli no está instalado. Deseas continuar solo con gzip? (y/n)"
  read response
  if [[ "$response" != "y" ]]; then
    echo "Terminando script. Instala brotli para compresión óptima."
    exit 1
  fi
  BROTLI_AVAILABLE=false
else
  BROTLI_AVAILABLE=true
fi

# Directorio que contiene los recursos estáticos
PUBLIC_DIR="./public"

# Tipos de archivos a comprimir
FILE_TYPES=( "*.html" "*.css" "*.js" "*.json" "*.svg" )

# Función para comprimir un archivo con gzip y brotli
compress_file() {
  local file=$1
  
  # Verificar que el archivo existe y no es un enlace simbólico
  if [[ ! -f "$file" || -L "$file" ]]; then
    return
  fi
  
  # Verificar si el archivo ya tiene versiones comprimidas
  if [[ -f "${file}.gz" ]]; then
    # Si existe una versión comprimida pero es más antigua que el original, eliminarla
    if [[ "${file}.gz" -ot "$file" ]]; then
      rm "${file}.gz"
    else
      echo "  Saltando ${file}.gz (ya existe y está actualizado)"
      HAS_GZIP=true
    fi
  fi
  
  # Comprimir con gzip si no existe o se eliminó
  if [[ "$HAS_GZIP" != "true" ]]; then
    echo "  Comprimiendo $file con gzip..."
    gzip -9 -c "$file" > "${file}.gz"
    if [[ $? -eq 0 ]]; then
      echo "  ✓ ${file}.gz creado"
    else
      echo "  ✗ Error al crear ${file}.gz"
    fi
  fi
  
  # Comprimir con brotli si está disponible
  if [[ "$BROTLI_AVAILABLE" == "true" ]]; then
    if [[ -f "${file}.br" ]]; then
      # Si existe una versión comprimida pero es más antigua que el original, eliminarla
      if [[ "${file}.br" -ot "$file" ]]; then
        rm "${file}.br"
      else
        echo "  Saltando ${file}.br (ya existe y está actualizado)"
        return
      fi
    fi
    
    echo "  Comprimiendo $file con brotli..."
    brotli -q 11 -o "${file}.br" "$file"
    if [[ $? -eq 0 ]]; then
      echo "  ✓ ${file}.br creado"
    else
      echo "  ✗ Error al crear ${file}.br"
    fi
  fi
}

# Contador de archivos procesados
total_files=0
compressed_files=0

# Procesar cada tipo de archivo
for type in "${FILE_TYPES[@]}"; do
  echo "Buscando archivos $type..."
  files=$(find "$PUBLIC_DIR" -type f -name "$type")
  
  for file in $files; do
    ((total_files++))
    HAS_GZIP=false
    
    # Saltamos archivos ya comprimidos
    if [[ "$file" == *.min.* || "$file" == *.gz || "$file" == *.br ]]; then
      echo "Saltando $file (ya comprimido)"
      continue
    fi
    
    echo "Procesando $file"
    compress_file "$file"
    ((compressed_files++))
  done
done

echo "=== Compresión completada ==="
echo "Total de archivos procesados: $total_files"
echo "Archivos comprimidos: $compressed_files"

# Agregar instrucciones para el servidor web
echo ""
echo "=== Siguientes pasos ==="
echo "Para que tu servidor web sirva estos archivos comprimidos:"
echo ""
echo "Si usas Express.js, agrega lo siguiente a tu archivo principal:"
echo "const express = require('express');"
echo "const app = express();"
echo ""
echo "// Middleware para servir archivos comprimidos"
echo "app.get('*.js', (req, res, next) => {"
echo "  req.url = req.url + '.gz';"
echo "  res.set('Content-Encoding', 'gzip');"
echo "  res.set('Content-Type', 'text/javascript');"
echo "  next();"
echo "});"
echo ""
echo "app.get('*.css', (req, res, next) => {"
echo "  req.url = req.url + '.gz';"
echo "  res.set('Content-Encoding', 'gzip');"
echo "  res.set('Content-Type', 'text/css');"
echo "  next();"
echo "});"
echo ""
echo "app.use(express.static('public'));"
echo ""
echo "Si usas Nginx, agrega esto a tu configuración:"
echo "server {"
echo "  # ..."
echo "  gzip_static on;"
echo "  brotli_static on;  # Si tu versión de Nginx lo soporta"
echo "  # ..."
echo "}" 