@echo off
setlocal enabledelayedexpansion

set "inputFile=public\css\styles.css"
set "outputFile=public\css\styles-desktop-only.css"
set "tempFile=temp.css"

:: Números de línea donde empiezan las media queries (basados en el resultado del comando findstr)
set "mediaQueries=1021 1049 1234 1273 2019 2411 2541 2802 2868"

:: Crear un archivo temporal con los números de línea y un marcador "START" o "END"
echo. > "%tempFile%"
for %%i in (%mediaQueries%) do (
    echo %%i:START >> "%tempFile%"
    :: Buscamos la llave de cierre correspondiente
    set /a lineNum=%%i
    set found=0
    set bracketsCount=1
    
    for /f "tokens=1* delims=:" %%a in ('findstr /n "^" "%inputFile%"') do (
        if %%a GTR !lineNum! (
            set line=%%b
            set "line=!line: =!"
            if "!line!"=="{" set /a bracketsCount+=1
            if "!line!"=="}" (
                set /a bracketsCount-=1
                if !bracketsCount!==0 (
                    echo %%a:END >> "%tempFile%"
                    set found=1
                    goto :next%%i
                )
            )
        )
    )
    :next%%i
)

:: Ordenar el archivo temporal numéricamente
sort "%tempFile%" /o "%tempFile%"

:: Procesar el archivo CSS original, omitiendo las secciones de media queries
set "skipFlag=0"
set "lineNum=0"
> "%outputFile%" (
    for /f "tokens=1* delims=:" %%a in ('findstr /n "^" "%inputFile%"') do (
        set /a lineNum+=1
        set match=0
        
        for /f "tokens=1,2 delims=:" %%i in (%tempFile%) do (
            if %%i==!lineNum! (
                if "%%j"=="START" set "skipFlag=1"
                if "%%j"=="END" set "skipFlag=0"
                set match=1
            )
        )
        
        if !skipFlag!==0 if !match!==0 echo %%b
    )
)

echo.
echo Proceso completado. El archivo sin media queries móviles está en: %outputFile%
echo Reemplaza el archivo original manualmente después de verificar el resultado.
del "%tempFile%"
