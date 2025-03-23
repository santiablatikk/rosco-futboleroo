$cssFilePath = ".\public\css\styles.css"
$outputFilePath = ".\public\css\styles-desktop-only.css"

# Leer el contenido del archivo
$content = Get-Content -Path $cssFilePath -Raw

# Patrón para encontrar media queries móviles
$mediaQueryPatterns = @(
    '@media\s+only\s+screen\s+and\s+\(max-width:\s*900px\)(?:\s*)\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}])*\}))*\}))*\}))*\}',
    '@media\s+only\s+screen\s+and\s+\(max-width:\s*768px\)(?:\s*)\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}])*\}))*\}))*\}))*\}',
    '@media\s+only\s+screen\s+and\s+\(max-width:\s*480px\)(?:\s*)\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}])*\}))*\}))*\}))*\}', 
    '@media\s+only\s+screen\s+and\s+\(max-width:\s*390px\)(?:\s*)\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}])*\}))*\}))*\}))*\}',
    '@media\s+screen\s+and\s+\(max-width:\s*768px\)(?:\s*)\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}])*\}))*\}))*\}))*\}',
    '@media\s+\(max-width:\s*768px\)(?:\s*)\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}])*\}))*\}))*\}))*\}',
    '@media\s+\(max-width:\s*480px\)(?:\s*)\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}])*\}))*\}))*\}))*\}'
)

# Eliminar todas las media queries móviles
foreach ($pattern in $mediaQueryPatterns) {
    $content = $content -replace $pattern, ''
}

# Limpiar líneas vacías múltiples consecutivas
$content = $content -replace '(\r?\n){3,}', "`r`n`r`n"

# Guardar el contenido en el nuevo archivo
$content | Out-File -FilePath $outputFilePath -Encoding utf8

Write-Host "Proceso completado. El archivo sin media queries móviles está en: $outputFilePath"
Write-Host "Revisa el archivo generado y, si todo está correcto, reemplaza el original manualmente."
