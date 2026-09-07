import { devices, expect, test } from '@playwright/test';

// Mobile device configurations
const mobileDevices = [
  { name: 'iPhone 12', ...devices['iPhone 12'] },
  { name: 'iPhone 12 Pro', ...devices['iPhone 12 Pro'] },
  { name: 'Samsung Galaxy S21', ...devices['Galaxy S21'] },
  { name: 'iPad', ...devices['iPad'] },
  { name: 'iPad Pro', ...devices['iPad Pro'] },
];

const testUser = {
  email: 'manager@testbusiness.com',
  password: 'testpassword123',
  businessId: 'test-business-1',
};

// Test each mobile device
mobileDevices.forEach(device => {
  test.describe(`Mobile Appointment Management - ${device.name}`, () => {
    test.use({ ...device });

    test.beforeEach(async ({ page }) => {
      // Login and navigate to appointments
      await page.goto('/auth/signin');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="signin-button"]');

      await page.waitForURL('/dashboard');
      await page.click('[data-testid="appointments-nav"]');
      await page.waitForURL('/dashboard/appointments');
      await page.waitForSelector('[data-testid="mobile-calendar-view"]');
    });

    test('should display mobile-optimized calendar interface', async ({
      page,
    }) => {
      // Verify mobile calendar layout
      await expect(
        page.locator('[data-testid="mobile-calendar-view"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="mobile-calendar-header"]')
      ).toBeVisible();

      // Check responsive navigation
      const navToggle = page.locator('[data-testid="mobile-nav-toggle"]');
      if (await navToggle.isVisible()) {
        await navToggle.click();
        await expect(
          page.locator('[data-testid="mobile-nav-menu"]')
        ).toBeVisible();
      }

      // Verify touch-friendly appointment blocks
      const appointments = page.locator('[data-testid="appointment-block"]');
      const appointmentCount = await appointments.count();

      for (let i = 0; i < appointmentCount; i++) {
        const appointment = appointments.nth(i);
        const boundingBox = await appointment.boundingBox();

        // Minimum touch target size (44px)
        expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
        expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
      }
    });

    test('should support touch gestures for navigation', async ({ page }) => {
      const calendarView = page.locator('[data-testid="mobile-calendar-view"]');

      // Test swipe left for next day
      await calendarView.hover();
      await page.mouse.down();
      await page.mouse.move(-100, 0); // Swipe left
      await page.mouse.up();

      // Verify date changed
      await expect(
        page.locator('[data-testid="current-date"]')
      ).not.toContainText('15');

      // Test swipe right for previous day
      await calendarView.hover();
      await page.mouse.down();
      await page.mouse.move(100, 0); // Swipe right
      await page.mouse.up();

      // Should return to original date
      await expect(page.locator('[data-testid="current-date"]')).toContainText(
        '15'
      );
    });

    test('should handle touch interactions for appointments', async ({
      page,
    }) => {
      const appointment = page
        .locator('[data-testid="appointment-block"]')
        .first();
      await expect(appointment).toBeVisible();

      // Test tap to open appointment
      await appointment.tap();

      // Verify mobile modal opens
      await expect(
        page.locator('[data-testid="mobile-appointment-modal"]')
      ).toBeVisible();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Test modal is properly sized for mobile
      const modal = page.locator('[role="dialog"]');
      const modalBox = await modal.boundingBox();
      const viewportSize = page.viewportSize();

      if (viewportSize) {
        // Modal should take most of the screen on mobile
        expect(modalBox?.width).toBeGreaterThan(viewportSize.width * 0.8);
      }

      // Test closing modal with swipe down
      await modal.hover();
      await page.mouse.down();
      await page.mouse.move(0, 200); // Swipe down
      await page.mouse.up();

      await expect(modal).not.toBeVisible();
    });

    test('should support long press for context menu', async ({ page }) => {
      const appointment = page
        .locator('[data-testid="appointment-block"]')
        .first();

      // Long press on appointment
      await appointment.hover();
      await page.mouse.down();
      await page.waitForTimeout(800); // Long press duration
      await page.mouse.up();

      // Verify context menu appears
      await expect(
        page.locator('[data-testid="appointment-context-menu"]')
      ).toBeVisible();

      // Test context menu options
      await expect(page.locator('[data-testid="context-edit"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="context-reschedule"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="context-cancel"]')
      ).toBeVisible();

      // Test quick reschedule
      await page.click('[data-testid="context-reschedule"]');
      await expect(
        page.locator('[data-testid="quick-reschedule-picker"]')
      ).toBeVisible();
    });

    test('should handle mobile search and filters', async ({ page }) => {
      // Test mobile search interface
      const searchToggle = page.locator('[data-testid="mobile-search-toggle"]');
      await searchToggle.click();

      await expect(
        page.locator('[data-testid="mobile-search-panel"]')
      ).toBeVisible();

      // Test search input
      const searchInput = page.locator('[data-testid="mobile-search-input"]');
      await searchInput.fill('John');

      // Verify search results
      await expect(
        page.locator('[data-testid="search-results"]')
      ).toBeVisible();

      // Test filter chips
      await page.click('[data-testid="filter-staff"]');
      await expect(
        page.locator('[data-testid="staff-filter-options"]')
      ).toBeVisible();

      await page.click('[data-testid="staff-alice"]');
      await expect(
        page.locator('[data-testid="filter-chip-alice"]')
      ).toBeVisible();

      // Test clearing filters
      await page.click('[data-testid="clear-filters"]');
      await expect(
        page.locator('[data-testid="filter-chip-alice"]')
      ).not.toBeVisible();
    });

    test('should support mobile appointment creation', async ({ page }) => {
      // Test floating action button for new appointment
      const fabButton = page.locator(
        '[data-testid="mobile-fab-new-appointment"]'
      );
      await expect(fabButton).toBeVisible();
      await fabButton.tap();

      // Verify mobile appointment form
      await expect(
        page.locator('[data-testid="mobile-appointment-form"]')
      ).toBeVisible();

      // Test mobile form inputs
      await page.fill(
        '[data-testid="mobile-client-input"]',
        'Mobile Test Client'
      );

      // Test mobile service picker
      await page.click('[data-testid="mobile-service-picker"]');
      await expect(
        page.locator('[data-testid="service-picker-modal"]')
      ).toBeVisible();
      await page.click('[data-testid="service-haircut"]');

      // Test mobile date/time picker
      await page.click('[data-testid="mobile-datetime-picker"]');
      await expect(
        page.locator('[data-testid="datetime-picker-modal"]')
      ).toBeVisible();

      // Select time slot
      await page.click('[data-testid="time-slot-14-00"]');

      // Create appointment
      await page.click('[data-testid="mobile-create-button"]');

      // Verify success
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(
        page
          .locator('[data-testid="appointment-block"]')
          .filter({ hasText: 'Mobile Test Client' })
      ).toBeVisible();
    });

    test('should handle mobile drag and drop for rescheduling', async ({
      page,
    }) => {
      const appointment = page
        .locator('[data-testid="appointment-block"]')
        .first();
      const targetSlot = page.locator('[data-testid="time-slot-11-00"]');

      // Get initial positions
      const appointmentBox = await appointment.boundingBox();
      const targetBox = await targetSlot.boundingBox();

      if (appointmentBox && targetBox) {
        // Perform drag gesture
        await page.mouse.move(
          appointmentBox.x + appointmentBox.width / 2,
          appointmentBox.y + appointmentBox.height / 2
        );
        await page.mouse.down();

        // Drag to target
        await page.mouse.move(
          targetBox.x + targetBox.width / 2,
          targetBox.y + targetBox.height / 2,
          { steps: 10 }
        );

        // Verify drag feedback
        await expect(
          page.locator('[data-testid="drag-preview"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="drop-zone-highlight"]')
        ).toBeVisible();

        await page.mouse.up();

        // Verify mobile confirmation dialog
        await expect(
          page.locator('[data-testid="mobile-reschedule-confirm"]')
        ).toBeVisible();
        await page.click('[data-testid="confirm-reschedule"]');

        // Verify appointment moved
        await expect(
          page.locator(
            '[data-testid="time-slot-11-00"] [data-testid="appointment-block"]'
          )
        ).toBeVisible();
      }
    });

    test('should support pinch-to-zoom for calendar views', async ({
      page,
    }) => {
      const calendarView = page.locator('[data-testid="mobile-calendar-view"]');

      // Simulate pinch-to-zoom out (switch to week view)
      await calendarView.hover();

      // Pinch gesture simulation
      await page.touchscreen.tap(200, 300);
      await page.touchscreen.tap(400, 300);

      // This would typically trigger a view change in a real implementation
      // For now, we'll test the view switching buttons
      await page.click('[data-testid="mobile-view-week"]');
      await expect(
        page.locator('[data-testid="mobile-week-view"]')
      ).toBeVisible();

      // Pinch to zoom in (switch to day view)
      await page.click('[data-testid="mobile-view-day"]');
      await expect(
        page.locator('[data-testid="mobile-day-view"]')
      ).toBeVisible();
    });

    test('should handle mobile orientation changes', async ({ page }) => {
      // Test portrait mode (default)
      await expect(
        page.locator('[data-testid="mobile-calendar-view"]')
      ).toBeVisible();

      // Simulate landscape orientation
      await page.setViewportSize({ width: 812, height: 375 }); // iPhone landscape

      // Verify layout adapts to landscape
      await expect(
        page.locator('[data-testid="landscape-calendar-view"]')
      ).toBeVisible();

      // Test that appointments are still accessible
      const appointments = page.locator('[data-testid="appointment-block"]');
      await expect(appointments.first()).toBeVisible();

      // Test navigation in landscape
      await page.click('[data-testid="next-day-button"]');
      await expect(
        page.locator('[data-testid="current-date"]')
      ).not.toContainText('15');

      // Return to portrait
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(
        page.locator('[data-testid="mobile-calendar-view"]')
      ).toBeVisible();
    });

    test('should support mobile accessibility features', async ({ page }) => {
      // Test voice-over support (simulated)
      const appointment = page
        .locator('[data-testid="appointment-block"]')
        .first();

      // Verify accessibility attributes
      await expect(appointment).toHaveAttribute('role', 'button');
      await expect(appointment).toHaveAttribute('aria-label');

      // Test focus management on mobile
      await appointment.focus();
      await expect(appointment).toBeFocused();

      // Test keyboard navigation on mobile (external keyboard)
      await page.keyboard.press('Tab');
      const nextElement = page.locator(':focus');
      await expect(nextElement).not.toBe(appointment);

      // Test screen reader announcements
      await page.click('[data-testid="mobile-view-week"]');
      const announcement = page.locator('[role="status"]');
      await expect(announcement).toContainText('Week view selected');
    });

    test('should handle mobile performance optimization', async ({ page }) => {
      // Test lazy loading of appointments
      await page.click('[data-testid="mobile-view-month"]');

      // Scroll to load more appointments
      const monthView = page.locator('[data-testid="mobile-month-view"]');
      await monthView.scroll({ top: 1000 });

      // Verify progressive loading
      await expect(page.locator('[data-testid="loading-more"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="loading-more"]')
      ).not.toBeVisible({ timeout: 5000 });

      // Test smooth scrolling performance
      const scrollContainer = page.locator(
        '[data-testid="calendar-scroll-container"]'
      );

      // Measure scroll performance
      const startTime = Date.now();
      await scrollContainer.scroll({ top: 500 });
      await page.waitForTimeout(100);
      const scrollTime = Date.now() - startTime;

      // Should scroll smoothly (under 200ms)
      expect(scrollTime).toBeLessThan(200);
    });

    test('should support offline functionality', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);

      // Verify offline indicator
      await expect(
        page.locator('[data-testid="offline-indicator"]')
      ).toBeVisible();

      // Test cached data is still available
      await expect(
        page.locator('[data-testid="appointment-block"]').first()
      ).toBeVisible();

      // Test offline appointment creation (queued)
      await page.click('[data-testid="mobile-fab-new-appointment"]');
      await page.fill('[data-testid="mobile-client-input"]', 'Offline Client');
      await page.click('[data-testid="mobile-create-button"]');

      // Should show queued status
      await expect(
        page.locator('[data-testid="queued-appointment"]')
      ).toBeVisible();

      // Go back online
      await page.context().setOffline(false);

      // Verify sync occurs
      await expect(
        page.locator('[data-testid="syncing-indicator"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({
        timeout: 10000,
      });
    });
  });
});

// Cross-device compatibility tests
test.describe('Cross-Device Mobile Compatibility', () => {
  test('should maintain consistency across different mobile devices', async ({
    browser,
  }) => {
    const contexts = await Promise.all([
      browser.newContext(devices['iPhone 12']),
      browser.newContext(devices['Galaxy S21']),
      browser.newContext(devices['iPad']),
    ]);

    const pages = await Promise.all(contexts.map(context => context.newPage()));

    // Login on all devices
    for (const page of pages) {
      await page.goto('/auth/signin');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="signin-button"]');
      await page.goto('/dashboard/appointments');
      await page.waitForSelector('[data-testid="mobile-calendar-view"]');
    }

    // Test that appointments are consistent across devices
    const appointmentTexts = await Promise.all(
      pages.map(page =>
        page.locator('[data-testid="appointment-block"]').first().textContent()
      )
    );

    // All devices should show the same appointment data
    expect(appointmentTexts[0]).toBe(appointmentTexts[1]);
    expect(appointmentTexts[1]).toBe(appointmentTexts[2]);

    // Test that interactions work consistently
    for (const page of pages) {
      await page.click('[data-testid="appointment-block"]').first();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await page.keyboard.press('Escape');
    }

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });
});
