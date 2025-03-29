/**
 * Utilidades compartidas para el perfil y el ranking
 */

const ProfileUtils = {
    // Intervalo de actualización en milisegundos (10 segundos)
    UPDATE_INTERVAL: 10000,
    
    // Almacenamiento temporal de perfiles por usuario
    cachedProfiles: {},
    
    // Almacenamiento de datos de ranking
    cachedRanking: null,
    
    /**
     * Obtiene todos los perfiles de usuarios
     */
    async getAllProfiles() {
        try {
            const response = await fetch('/api/profile?all=true');
            if (!response.ok) {
                throw new Error('Error al obtener perfiles');
            }
            const profiles = await response.json();
            return profiles || [];
        } catch (error) {
            console.error('Error fetching profiles:', error);
            return [];
        }
    },
    
    /**
     * Obtiene un perfil específico por nombre de usuario
     */
    async getProfileByUsername(username) {
        if (!username) return null;
        
        // Comprobar caché
        if (this.cachedProfiles[username]) {
            return this.cachedProfiles[username];
        }
        
        try {
            const response = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
            if (!response.ok) {
                throw new Error('Error al obtener perfil');
            }
            
            const profile = await response.json();
            if (profile) {
                // Guardar en caché
                this.cachedProfiles[username] = profile;
            }
            
            return profile;
        } catch (error) {
            console.error(`Error getting profile for ${username}:`, error);
            return null;
        }
    },
    
    /**
     * Obtiene datos completos del ranking global
     */
    async getRankingData(period = 'global', forceRefresh = false) {
        // Si tenemos datos en caché y no se fuerza refresco, devolverlos
        if (this.cachedRanking && !forceRefresh) {
            return this.cachedRanking;
        }
        
        try {
            const response = await fetch('/api/ranking');
            if (!response.ok) {
                throw new Error('Error al obtener ranking');
            }
            
            let rankingData = await response.json();
            
            // Filtrar por período si es necesario
            if (period !== 'global') {
                const now = new Date();
                const startDate = new Date();
                
                if (period === 'monthly') {
                    startDate.setMonth(now.getMonth() - 1);
                } else if (period === 'weekly') {
                    startDate.setDate(now.getDate() - 7);
                }
                
                rankingData = rankingData.filter(entry => {
                    if (!entry.date) return false;
                    const entryDate = new Date(entry.date);
                    return entryDate >= startDate && entryDate <= now;
                });
            }
            
            // Guardar en caché
            this.cachedRanking = rankingData;
            
            return rankingData;
        } catch (error) {
            console.error('Error getting ranking data:', error);
            return [];
        }
    },
    
    /**
     * Inicia la actualización automática de datos
     */
    startAutoRefresh(onProfileUpdate, onRankingUpdate) {
        // Detener cualquier intervalo anterior
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
        }
        
        // Crear nuevo intervalo de actualización
        this._refreshInterval = setInterval(async () => {
            // Refrescar ranking
            if (typeof onRankingUpdate === 'function') {
                const ranking = await this.getRankingData('global', true);
                onRankingUpdate(ranking);
            }
            
            // Refrescar perfil actual
            if (typeof onProfileUpdate === 'function') {
                const username = localStorage.getItem('username');
                if (username) {
                    const profile = await this.getProfileByUsername(username);
                    onProfileUpdate(profile);
                }
            }
        }, this.UPDATE_INTERVAL);
        
        // Realizar una actualización inicial inmediata
        this.refreshData(onProfileUpdate, onRankingUpdate);
    },
    
    /**
     * Fuerza una actualización de datos
     */
    async refreshData(onProfileUpdate, onRankingUpdate) {
        if (typeof onRankingUpdate === 'function') {
            const ranking = await this.getRankingData('global', true);
            onRankingUpdate(ranking);
        }
        
        if (typeof onProfileUpdate === 'function') {
            const username = localStorage.getItem('username');
            if (username) {
                const profile = await this.getProfileByUsername(username);
                onProfileUpdate(profile);
            }
        }
    },
    
    /**
     * Detiene la actualización automática
     */
    stopAutoRefresh() {
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
            this._refreshInterval = null;
        }
    }
}; 