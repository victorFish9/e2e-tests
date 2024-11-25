const { test, expect, beforeEach, describe } = require('@playwright/test');

describe('Blog app', () => {
    let userCredentials = {
        username: 'testuser',
        password: 'testpassword'
    };

    beforeEach(async ({ page, request }) => {
        await request.delete('http://localhost:3003/api/blogs');
        await request.delete('http://localhost:3003/api/users');

        await request.post('http://localhost:3003/api/users', {
            data: userCredentials
        });

        await page.goto('http://localhost:5173');
    });

    test('Login form is shown', async ({ page }) => {
        const loginForm = await page.locator('form[role="form"]');
        await loginForm.waitFor({ state: 'visible' });
        expect(await loginForm.isVisible()).toBeTruthy();
    });

    describe('Login', () => {
        test('succeeds with correct credentials', async ({ page }) => {
            await page.fill('input[name="Username"]', userCredentials.username);
            await page.fill('input[name="Password"]', userCredentials.password);

            await page.click('button[type="submit"]');

            const userName = await page.locator('p').withText(userCredentials.username);
            await userName.waitFor({ state: 'visible' });

            expect(await userName.isVisible()).toBeTruthy();
        });

        test('fails with wrong credentials', async ({ page }) => {
            await page.fill('input[name="Username"]', 'wronguser');
            await page.fill('input[name="Password"]', 'wrongpassword');

            await page.click('button[type="submit"]');

            const errorMessage = await page.locator('div[style*="background-color: #f8d7da"]');
            await errorMessage.waitFor({ state: 'visible' });

            expect(await errorMessage.isVisible()).toBeTruthy();
        });
    });

    describe('When logged in', () => {
        beforeEach(async ({ page }) => {
            await page.fill('input[name="Username"]', userCredentials.username);
            await page.fill('input[name="Password"]', userCredentials.password);
            await page.click('button[type="submit"]');

            const userName = await page.locator('p').withText(userCredentials.username);
            await userName.waitFor({ state: 'visible' });

            const newBlogButton = await page.locator('button').withText('new blog');
            await newBlogButton.click();

            await page.fill('input[name="title"]', 'Test Blog');
            await page.fill('input[name="author"]', 'Test Author');
            await page.fill('input[name="url"]', 'http://example.com');

            await page.click('button[type="submit"]');
        });

        test('a new blog can be created', async ({ page }) => {
            const newBlogTitle = await page.locator('div').withText('Test Blog');
            const newBlogAuthor = await page.locator('div').withText('Test Author');

            expect(await newBlogTitle.isVisible()).toBeTruthy();
            expect(await newBlogAuthor.isVisible()).toBeTruthy();
        });

        test('a blog can be liked', async ({ page }) => {
            const likeButton = await page.locator('button').withText('like');

            const initialLikes = await page.locator('div').withText('Test Blog').locator('p').nth(1);
            expect(await initialLikes.textContent()).toContain('Likes: 0');

            await likeButton.click();

            const updatedLikes = await page.locator('div').withText('Test Blog').locator('p').nth(1);
            expect(await updatedLikes.textContent()).toContain('Likes: 1');

            await likeButton.click();

            const incrementedLikes = await page.locator('div').withText('Test Blog').locator('p').nth(1);
            expect(await incrementedLikes.textContent()).toContain('Likes: 2');
        });

        test('a blog can be deleted by the creator', async ({ page }) => {
            const viewButton = await page.locator('button').withText('view');
            await viewButton.click();

            const deleteButton = await page.locator('button').withText('remove');
            expect(await deleteButton.isVisible()).toBeTruthy();

            await deleteButton.click();

            const deletedBlog = await page.locator('div').withText('Test Blog');
            expect(await deletedBlog.count()).toBe(0);
        });

        test('a blog cannot be deleted by other users', async ({ page, request }) => {
            const logoutButton = await page.locator('button').withText('logout');
            await logoutButton.click();

            const newUser = { username: 'anotheruser', password: 'anotherpassword' };
            await request.post('http://localhost:3003/api/users', {
                data: newUser
            });

            await page.fill('input[name="Username"]', newUser.username);
            await page.fill('input[name="Password"]', newUser.password);
            await page.click('button[type="submit"]');

            const viewButton = await page.locator('button').withText('view');
            await viewButton.click();

            const deleteButton = await page.locator('button').withText('remove');
            expect(await deleteButton.count()).toBe(0);
        });
    });
});
