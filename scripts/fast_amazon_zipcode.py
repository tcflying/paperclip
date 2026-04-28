from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print('打开 Amazon...')
        page.goto('https://www.amazon.com', wait_until='domcontentloaded')

        print('查找地址选择器...')
        page.click('#nav-global-location-slot', timeout=5000)

        print('查找邮编输入框...')
        page.fill('#GLUXZipUpdateInput', '10021', timeout=5000)

        print('点击应用按钮...')
        page.click('#GLUXZipUpdate input.a-button-input', timeout=5000)

        print('✅ 邮编已修改为 10021')
        page.screenshot(path='result.png')

        browser.close()

if __name__ == '__main__':
    main()
