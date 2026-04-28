from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        # 启动有头浏览器
        browser = p.chromium.launch(headless=False, args=['--start-maximized'])
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        print('🌐 打开 Amazon.com...')
        page.goto('https://www.amazon.com', wait_until='domcontentloaded')
        page.wait_for_timeout(2000)

        print('📍 查找并点击地址选择器...')
        page.click('#nav-global-location-slot')
        page.wait_for_timeout(3000)

        print('✏️ 输入邮编 10021...')
        page.fill('#GLUXZipUpdateInput', '10021')
        page.wait_for_timeout(1000)

        print('🖱️ 点击应用按钮...')
        page.click('#GLUXZipUpdate input.a-button-input')
        page.wait_for_timeout(3000)

        print('✅ 邮编修改完成！页面保持打开...')
        print('💡 请检查页面，然后手动关闭窗口')

        # 保持浏览器打开，不自动关闭
        page.wait_for_timeout(60000)  # 等待 60 秒，用户可以手动检查

if __name__ == '__main__':
    main()
