import os
import hashlib

def hash_file(filepath):
    """Genera un hash SHA-1 para el archivo especificado."""
    hasher = hashlib.sha1()
    with open(filepath, 'rb') as file:
        buf = file.read()
        hasher.update(buf)
    return hasher.hexdigest()

def find_duplicates(directory):
    """Encuentra archivos duplicados en el directorio especificado."""
    hashes = {}
    duplicates = []

    for root, _, files in os.walk(directory):
        for filename in files:
            filepath = os.path.join(root, filename)
            file_hash = hash_file(filepath)
            if file_hash in hashes:
                duplicates.append((filepath, hashes[file_hash]))
            else:
                hashes[file_hash] = filepath

    return duplicates

def delete_duplicates(duplicates):
    """Elimina archivos duplicados."""
    for duplicate, original in duplicates:
        print(f"Eliminando duplicado: {duplicate}")
        os.remove(duplicate)

if __name__ == "__main__":
    project_directory = r"c:\Users\santi\Desktop\rosco-futboleroo"
    duplicates = find_duplicates(project_directory)
    
    if duplicates:
        print("Archivos duplicados encontrados:")
        for duplicate, original in duplicates:
            print(f"Duplicado: {duplicate} | Original: {original}")
        
        confirm = input("¿Deseas eliminar estos archivos duplicados? (s/n): ")
        if confirm.lower() == 's':
            delete_duplicates(duplicates)
            print("Archivos duplicados eliminados.")
        else:
            print("No se eliminaron archivos.")
    else:
        print("No se encontraron archivos duplicados.")