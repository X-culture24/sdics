/**
 * Notification System - Toast and modal notifications
 */

import { NOTIFICATION_TYPES } from '../utils/constants.js';

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
            this.container = container;
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    /**
     * Show notification toast
     * @param {string} message - Notification message
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (0 = persistent)
     */
    show(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type, duration);
        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * Show success notification
     */
    success(message, duration = 5000) {
        return this.show(message, NOTIFICATION_TYPES.SUCCESS, duration);
    }

    /**
     * Show error notification
     */
    error(message, duration = 7000) {
        return this.show(message, NOTIFICATION_TYPES.ERROR, duration);
    }

    /**
     * Show warning notification
     */
    warning(message, duration = 6000) {
        return this.show(message, NOTIFICATION_TYPES.WARNING, duration);
    }

    /**
     * Show info notification
     */
    info(message, duration = 5000) {
        return this.show(message, NOTIFICATION_TYPES.INFO, duration);
    }

    /**
     * Create notification element
     */
    createNotification(message, type, duration) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            pointer-events: auto;
            opacity: 0;
            transform: translateX(400px);
            transition: all 0.3s ease;
            min-width: 250px;
            max-width: 400px;
        `;

        // Icon
        const icon = document.createElement('span');
        icon.style.cssText = `
            flex-shrink: 0;
            font-size: 20px;
            line-height: 1;
        `;

        // Set icon and color based on type
        const typeConfig = {
            success: { icon: '✓', color: '#28a745' },
            error: { icon: '✕', color: '#dc3545' },
            warning: { icon: '⚠', color: '#f9a825' },
            info: { icon: 'ℹ', color: '#0066cc' }
        };

        const config = typeConfig[type] || typeConfig.info;
        icon.textContent = config.icon;
        icon.style.color = config.color;

        // Message
        const messageEl = document.createElement('span');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            flex: 1;
            color: #333;
            font-size: 14px;
            line-height: 1.4;
            word-break: break-word;
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            flex-shrink: 0;
            background: none;
            border: none;
            color: #999;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            line-height: 1;
            transition: color 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.color = '#333';
        closeBtn.onmouseout = () => closeBtn.style.color = '#999';
        closeBtn.onclick = () => this.remove(notification);

        notification.appendChild(icon);
        notification.appendChild(messageEl);
        notification.appendChild(closeBtn);

        return notification;
    }

    /**
     * Remove notification
     */
    remove(notification) {
        notification.classList.remove('show');
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';

        setTimeout(() => {
            notification.remove();
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach(notification => {
            notification.remove();
        });
        this.notifications = [];
    }

    /**
     * Show confirm dialog
     */
    confirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const {
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                isDangerous = false
            } = options;

            const modal = this.createConfirmModal(
                title,
                message,
                confirmText,
                cancelText,
                isDangerous,
                (confirmed) => {
                    modal.remove();
                    resolve(confirmed);
                }
            );

            document.body.appendChild(modal);
        });
    }

    /**
     * Create confirm modal
     */
    createConfirmModal(title, message, confirmText, cancelText, isDangerous, callback) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 32px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease;
        `;

        const titleEl = document.createElement('h2');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            margin: 0 0 12px 0;
            color: #003d7a;
            font-size: 20px;
            font-weight: 600;
        `;

        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            margin: 0 0 24px 0;
            color: #666;
            font-size: 14px;
            line-height: 1.5;
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = cancelText;
        cancelBtn.style.cssText = `
            padding: 10px 20px;
            border: 1px solid #ddd;
            background: white;
            color: #333;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        `;
        cancelBtn.onhover = () => cancelBtn.style.background = '#f5f5f5';
        cancelBtn.onclick = () => callback(false);

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = confirmText;
        confirmBtn.style.cssText = `
            padding: 10px 20px;
            border: none;
            background: ${isDangerous ? '#dc3545' : '#0066cc'};
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        `;
        confirmBtn.onmouseover = () => {
            confirmBtn.style.opacity = '0.9';
            confirmBtn.style.transform = 'scale(1.02)';
        };
        confirmBtn.onmouseout = () => {
            confirmBtn.style.opacity = '1';
            confirmBtn.style.transform = 'scale(1)';
        };
        confirmBtn.onclick = () => callback(true);

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);

        dialog.appendChild(titleEl);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);

        return modal;
    }
}

// Global instance
let notificationManager = null;

/**
 * Get or create notification manager instance
 */
function getNotificationManager() {
    if (!notificationManager) {
        notificationManager = new NotificationManager();
    }
    return notificationManager;
}

export { NotificationManager, getNotificationManager };
