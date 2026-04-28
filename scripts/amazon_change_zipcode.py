from playwright.sync_api import sync_playwright
import sys

def change_amazon_zipcode(zipcode='10021'):
    with sync_playwright() as p:
        # 启动浏览器（非无头模式，可以看到操作）
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        try:
            print(f'🌐 打开 Amazon.com...')
            page.goto('https://www.amazon.com')
            page.wait_for_load_state('networkidle')

            print('📍 等待页面加载完成...')
            page.wait_for_timeout(2000)

            # 截图保存初始状态
            page.screenshot(path='amazon_initial.png')
            print('📸 已保存初始截图: amazon_initial.png')

            # 尝试点击 "Deliver to" 地址选择器
            print('🖱️ 查找并点击地址选择器...')
            try:
                # Amazon 的地址选择器通常在顶部导航栏
                deliver_button = page.locator('#nav-global-location-slot').first
                deliver_button.click()
                page.wait_for_timeout(2000)
                print('✅ 已点击地址选择器')
            except Exception as e:
                print(f'⚠️ 点击地址选择器失败: {e}')

            # 查找邮编输入框
            print('🔍 查找邮编输入框...')
            try:
                # 尝试多种可能的选择器
                zip_input_selectors = [
                    '#GLUXZipUpdateInput',
                    'input[name="zipCode"]',
                    'input[id*="zip"]',
                    'input[aria-label*="zip" i]'
                ]

                zip_input = None
                for selector in zip_input_selectors:
                    try:
                        zip_input = page.locator(selector).first
                        if zip_input.is_visible():
                            print(f'✅ 找到邮编输入框: {selector}')
                            break
                    except:
                        continue

                if zip_input and zip_input.is_visible():
                    print(f'✏️ 修改邮编为: {zipcode}')
                    zip_input.fill(zipcode)

                    # 点击 Apply/Update 按钮
                    apply_button_selectors = [
                        '#GLUXZipUpdate input.a-button-input',
                        'button:has-text("Apply")',
                        'input[value*="Apply" i]'
                    ]

                    for selector in apply_button_selectors:
                        try:
                            apply_button = page.locator(selector).first
                            if apply_button.is_visible():
                                print(f'✅ 找到并点击应用按钮: {selector}')
                                apply_button.click()
                                break
                        except:
                            continue

                    page.wait_for_timeout(2000)
                    print('✅ 邮编修改完成')

                    # 截图保存结果
                    page.screenshot(path='amazon_zipcode_changed.png')
                    print('📸 已保存修改后截图: amazon_zipcode_changed.png')
                else:
                    print('❌ 未找到邮编输入框，可能需要先登录 Amazon 账号')
                    page.screenshot(path='amazon_no_zip_input.png')
                    print('📸 已保存截图: amazon_no_zip_input.png')

            except Exception as e:
                print(f'❌ 操作失败: {e}')
                page.screenshot(path='amazon_error.png')
                print('📸 已保存错误截图: amazon_error.png')

        except Exception as e:
            print(f'❌ 严重错误: {e}')
            try:
                page.screenshot(path='amazon_fatal_error.png')
                print('📸 已保存致命错误截图')
            except:
                pass

        finally:
            print('⏳ 等待 5 秒后关闭浏览器...')
            page.wait_for_timeout(5000)
            browser.close()

if __name__ == '__main__':
    zipcode = sys.argv[1] if len(sys.argv) > 1 else '10021'
    print(f'🎯 目标邮编: {zipcode}')
    change_amazon_zipcode(zipcode)
