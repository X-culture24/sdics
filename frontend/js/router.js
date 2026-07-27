export class Router {
    constructor() {
        this.routes = {};
        this.currentPath = null;
    }

    on(path, callback) {
        this.routes[path] = callback;
    }

    async navigate(path) {
        if (this.currentPath === path) return;
        
        this.currentPath = path;
        window.history.pushState({}, '', path);

        const route = this.routes[path];
        if (route) {
            await route();
        }
    }

    start() {
        window.addEventListener('popstate', () => {
            const path = window.location.pathname;
            const route = this.routes[path];
            if (route) {
                route();
            }
        });

        // Handle initial route
        const path = window.location.pathname || '/';
        const route = this.routes[path];
        if (route) {
            route();
        } else {
            this.navigate('/');
        }
    }
}
