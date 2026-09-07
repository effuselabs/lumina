import { expect, test } from '@playwright/test';

// Test data
const testAppointment = {
  client: 'John Doe',
  service: 'Haircut',
  staff: 'Alice Johnson',
  date: '2024-01-15',
  time: '10:00',
};

const testUser = {
  email: 'manager@testbusiness.com',
  password: 'testpassword123',
  businessId: 'test-business-1',
};

test.describe('Appointment Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="signin-button"]');

    // Navigate to appointments dashboard
    await page.waitForURL('/dashboard');
    await page.click('[data-testid="appointments-nav"]');
    await page.waitForURL('/dashboard/appointments');

    // Wait for calendar to load
    await page.waitForSelector('[data-testid="calendar-view"]');
  });

  test('should complete full appointment creation workflow', async ({
    page,
  }) => {
    // Click on empty time slot
    await page.click('[data-testid="time-slot-10-00"]');

    // Verify modal opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=New Appointment')).toBeVisible();

    // Fill appointment form
    await page.fill('[data-testid="client-input"]', testAppointment.client);
    await page.selectOption(
      '[data-testid="service-select"]',
      testAppointment.service
    );
    await page.selectOption(
      '[data-testid="staff-select"]',
      testAppointment.staff
    );

    // Verify price and duration are calculated
    await expect(page.locator('[data-testid="total-price"]')).toContainText(
      '$50.00'
    );
    await expect(page.locator('[data-testid="total-duration"]')).toContainText(
      '60 minutes'
    );

    // Add notes
    await page.fill('[data-testid="notes-input"]', 'First time client');

    // Create appointment
    await page.click('[data-testid="create-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Appointment created successfully'
    );

    // Verify modal closes
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Verify appointment appears in calendar
    const appointmentBlock = page
      .locator('[data-testid="appointment-block"]')
      .filter({ hasText: testAppointment.client });
    await expect(appointmentBlock).toBeVisible();
    await expect(appointmentBlock).toContainText(testAppointment.service);
    await expect(appointmentBlock).toContainText('10:00 AM');
  });

  test('should handle appointment rescheduling via drag-and-drop', async ({
    page,
  }) => {
    // Wait for existing appointment to be visible
    const appointment = page
      .locator('[data-testid="appointment-block"]')
      .first();
    await expect(appointment).toBeVisible();

    // Get original position
    const originalSlot = await appointment
      .locator('..')
      .getAttribute('data-testid');

    // Drag appointment to new time slot
    const targetSlot = page.locator('[data-testid="time-slot-11-00"]');
    await appointment.dragTo(targetSlot);

    // Verify confirmation dialog
    await expect(
      page.locator('[data-testid="reschedule-confirmation"]')
    ).toBeVisible();
    await expect(page.locator('text=Confirm Reschedule')).toBeVisible();

    // Confirm reschedule
    await page.click('[data-testid="confirm-reschedule"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Appointment rescheduled successfully'
    );

    // Verify appointment moved to new slot
    const rescheduledAppointment = page.locator(
      '[data-testid="time-slot-11-00"] [data-testid="appointment-block"]'
    );
    await expect(rescheduledAppointment).toBeVisible();

    // Verify original slot is empty
    const originalSlotElement = page.locator(
      `[data-testid="${originalSlot}"] [data-testid="appointment-block"]`
    );
    await expect(originalSlotElement).not.toBeVisible();
  });

  test('should manage appointment conflicts appropriately', async ({
    page,
  }) => {
    // Try to create appointment in occupied time slot
    await page.click('[data-testid="time-slot-09-00"]'); // Assume this slot has an appointment

    // Fill form
    await page.fill('[data-testid="client-input"]', 'Jane Smith');
    await page.selectOption(
      '[data-testid="service-select"]',
      'Color Treatment'
    );
    await page.selectOption('[data-testid="staff-select"]', 'Alice Johnson');

    // Try to create
    await page.click('[data-testid="create-button"]');

    // Verify conflict warning
    await expect(
      page.locator('[data-testid="conflict-warning"]')
    ).toBeVisible();
    await expect(
      page.locator('text=Time slot conflicts with existing appointment')
    ).toBeVisible();

    // Verify suggested alternatives
    await expect(page.locator('[data-testid="suggested-times"]')).toBeVisible();

    // Select suggested time
    await page.click('[data-testid="suggested-time"]').first();

    // Create with new time
    await page.click('[data-testid="create-button"]');

    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Appointment created successfully'
    );
  });

  test('should sync updates across multiple user sessions', async ({
    page,
    context,
  }) => {
    // Open second browser tab/window
    const secondPage = await context.newPage();
    await secondPage.goto('/dashboard/appointments');
    await secondPage.waitForSelector('[data-testid="calendar-view"]');

    // Create appointment in first session
    await page.click('[data-testid="time-slot-14-00"]');
    await page.fill('[data-testid="client-input"]', 'Multi Session Test');
    await page.selectOption('[data-testid="service-select"]', 'Haircut');
    await page.selectOption('[data-testid="staff-select"]', 'Bob Smith');
    await page.click('[data-testid="create-button"]');

    // Verify appointment appears in first session
    await expect(
      page
        .locator('[data-testid="appointment-block"]')
        .filter({ hasText: 'Multi Session Test' })
    ).toBeVisible();

    // Verify appointment appears in second session (real-time sync)
    await expect(
      secondPage
        .locator('[data-testid="appointment-block"]')
        .filter({ hasText: 'Multi Session Test' })
    ).toBeVisible({ timeout: 10000 });

    // Edit appointment in second session
    await secondPage
      .click('[data-testid="appointment-block"]')
      .filter({ hasText: 'Multi Session Test' });
    await secondPage.click('[data-testid="edit-button"]');
    await secondPage.fill(
      '[data-testid="notes-input"]',
      'Updated from second session'
    );
    await secondPage.click('[data-testid="save-button"]');

    // Verify update appears in first session
    await page
      .click('[data-testid="appointment-block"]')
      .filter({ hasText: 'Multi Session Test' });
    await expect(
      page.locator('[data-testid="appointment-notes"]')
    ).toContainText('Updated from second session');

    await secondPage.close();
  });

  test('should handle search and filtering workflows', async ({ page }) => {
    // Test text search
    await page.fill('[data-testid="search-input"]', 'John');
    await page.waitForTimeout(500); // Debounce delay

    // Verify filtered results
    const visibleAppointments = page.locator(
      '[data-testid="appointment-block"]:visible'
    );
    await expect(visibleAppointments).toHaveCount(1);
    await expect(visibleAppointments.first()).toContainText('John');

    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    await page.waitForTimeout(500);

    // Test staff filter
    await page.selectOption('[data-testid="staff-filter"]', 'Alice Johnson');

    // Verify staff-filtered results
    const aliceAppointments = page.locator(
      '[data-testid="appointment-block"]:visible'
    );
    for (let i = 0; i < (await aliceAppointments.count()); i++) {
      await expect(aliceAppointments.nth(i)).toContainText('Alice Johnson');
    }

    // Test service filter
    await page.selectOption('[data-testid="service-filter"]', 'Haircut');

    // Verify combined filters
    const filteredAppointments = page.locator(
      '[data-testid="appointment-block"]:visible'
    );
    for (let i = 0; i < (await filteredAppointments.count()); i++) {
      const appointment = filteredAppointments.nth(i);
      await expect(appointment).toContainText('Alice Johnson');
      await expect(appointment).toContainText('Haircut');
    }

    // Test date range filter
    await page.click('[data-testid="date-range-filter"]');
    await page.fill('[data-testid="start-date"]', '2024-01-15');
    await page.fill('[data-testid="end-date"]', '2024-01-15');
    await page.click('[data-testid="apply-date-filter"]');

    // Verify date-filtered results
    const todayAppointments = page.locator(
      '[data-testid="appointment-block"]:visible'
    );
    await expect(todayAppointments.count()).toBeGreaterThan(0);
  });

  test('should support keyboard navigation and accessibility', async ({
    page,
  }) => {
    // Test keyboard navigation between appointments
    await page.keyboard.press('Tab');

    // First appointment should be focused
    const firstAppointment = page
      .locator('[data-testid="appointment-block"]')
      .first();
    await expect(firstAppointment).toBeFocused();

    // Navigate with arrow keys
    await page.keyboard.press('ArrowRight');
    const secondAppointment = page
      .locator('[data-testid="appointment-block"]')
      .nth(1);
    await expect(secondAppointment).toBeFocused();

    // Open appointment with Enter key
    await page.keyboard.press('Enter');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close with Escape key
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Test calendar view switching with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Navigate to view buttons
    await page.keyboard.press('Enter'); // Switch view

    // Verify ARIA labels and roles
    await expect(page.locator('[role="main"]')).toHaveAttribute(
      'aria-label',
      'Appointment Dashboard'
    );
    await expect(page.locator('[role="tablist"]')).toHaveAttribute(
      'aria-label',
      'Calendar Views'
    );
    await expect(page.locator('[role="grid"]')).toHaveAttribute(
      'aria-label',
      'Calendar Grid'
    );
  });

  test('should handle bulk operations correctly', async ({ page }) => {
    // Enable bulk selection mode
    await page.click('[data-testid="bulk-select-toggle"]');

    // Select multiple appointments
    await page.click('[data-testid="appointment-checkbox"]').first();
    await page.click('[data-testid="appointment-checkbox"]').nth(1);

    // Verify selection count
    await expect(page.locator('[data-testid="selected-count"]')).toContainText(
      '2 selected'
    );

    // Test bulk reschedule
    await page.click('[data-testid="bulk-actions-menu"]');
    await page.click('[data-testid="bulk-reschedule"]');

    // Select new date/time
    await page.fill('[data-testid="bulk-new-date"]', '2024-01-16');
    await page.selectOption('[data-testid="bulk-new-time"]', '10:00');

    // Confirm bulk operation
    await page.click('[data-testid="confirm-bulk-reschedule"]');

    // Verify progress indicator
    await expect(page.locator('[data-testid="bulk-progress"]')).toBeVisible();

    // Verify completion
    await expect(page.locator('[data-testid="bulk-success"]')).toContainText(
      '2 appointments rescheduled successfully'
    );

    // Test bulk cancellation
    await page.click('[data-testid="appointment-checkbox"]').first();
    await page.click('[data-testid="bulk-actions-menu"]');
    await page.click('[data-testid="bulk-cancel"]');

    // Confirm cancellation
    await page.click('[data-testid="confirm-bulk-cancel"]');

    // Verify appointments are cancelled
    await expect(page.locator('[data-testid="bulk-success"]')).toContainText(
      '1 appointment cancelled successfully'
    );
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Simulate network error by intercepting API calls
    await page.route('**/api/appointments', route => {
      route.abort('failed');
    });

    // Try to create appointment
    await page.click('[data-testid="time-slot-10-00"]');
    await page.fill('[data-testid="client-input"]', 'Error Test');
    await page.selectOption('[data-testid="service-select"]', 'Haircut');
    await page.click('[data-testid="create-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Failed to create appointment'
    );

    // Verify retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Test offline indicator
    await expect(
      page.locator('[data-testid="offline-indicator"]')
    ).toBeVisible();

    // Restore network and retry
    await page.unroute('**/api/appointments');
    await page.click('[data-testid="retry-button"]');

    // Verify success after retry
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Appointment created successfully'
    );
  });

  test('should maintain performance with large datasets', async ({ page }) => {
    // Navigate to month view with many appointments
    await page.click('[data-testid="month-view-button"]');

    // Measure calendar rendering time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="month-view"]');
    const renderTime = Date.now() - startTime;

    // Verify performance target (should render within 1 second)
    expect(renderTime).toBeLessThan(1000);

    // Test search performance
    const searchStartTime = Date.now();
    await page.fill('[data-testid="search-input"]', 'test');
    await page.waitForSelector('[data-testid="search-results"]');
    const searchTime = Date.now() - searchStartTime;

    // Verify search performance (should complete within 500ms)
    expect(searchTime).toBeLessThan(500);

    // Test scroll performance in day view
    await page.click('[data-testid="day-view-button"]');

    // Scroll through time slots
    const scrollContainer = page.locator(
      '[data-testid="calendar-scroll-container"]'
    );
    await scrollContainer.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });

    // Verify smooth scrolling without layout thrashing
    await expect(page.locator('[data-testid="time-slot-23-00"]')).toBeVisible();
  });
});
