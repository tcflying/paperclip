from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print('打开 Amazon...')
        page.goto('https://www.amazon.com', wait_until='domcontentloaded')
        page.wait_for_timeout(2000)

        print('截图初始状态...')
        page.screenshot(path='step1_initial.png')

        print('查找并点击地址选择器...')
        page.click('#nav-global-location-slot')
        page.wait_for_timeout(3000)

        print('截图弹窗...')
        page.screenshot(path='step2_popup.png')

        print('查找邮编输入框...')
        # 尝试多个选择器
        selectors = [
            '#GLUXZipUpdateInput',
            '#GLUXZipUpdateInput_0',
            'input[id^="GLUXZip"]',
            'input[name="zipCode"]',
            'input[placeholder*="zip" i]'
        ]

        zip_input = None
        for selector in selectors:
            try:
                element = page.locator(selector).first
                if element.is_visible(timeout=1000):
                    print(f'✅ 找到: {selector}')
                    zip_input = element
                    break
            except:
                print(f'❌ 未找到: {selector}')
                continue

        if zip_input:
            print('✏️ 输入邮编 10021...')
            zip_input.fill('10021')
            page.wait_for_timeout(1000)
            page.screenshot(path='step3_filled.png')

            print('🖱️ 点击应用按钮...')
            page.click('#GLUXZipUpdate input.a-button-input', timeout=2000)
            page.wait_for_timeout(2000)
            page.screenshot(path='step4_applied.png')

            print('✅ 邮编修改完成！')
        else:
            print('❌ 未能找到邮编输入框')
            # 打印页面 HTML 用于调试
            print(page.content()[:2000])

        browser.close()

if __name__ == '__main__':
    main()
