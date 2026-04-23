# Onboard Create Company

## Description
Complete the Paperclip onboarding flow to create a new company with CEO agent.

## Triggers
- User wants to create a new company
- User wants to onboard a new company
- User says "create company" or "onboarding"

## Steps

### Step 1: Login
Navigate to http://localhost:3100/auth, fill email "datobig18@gmail.com" and password "666888abc", click submit, wait for redirect to dashboard.

### Step 2: Go to Onboarding
Navigate to http://localhost:3100/onboarding, wait 2s. Close any modal if open by clicking "Close" button.

### Step 3: Click Start Onboarding
Click the "Start Onboarding" button.

### Step 4: Fill Company Name
Fill the first visible input with the company name (or "TestCompany" by default).

### Step 5: Click Next
Click the "Next" button.

### Step 6: Fill CEO Name
Fill the first visible input with "CEO".

### Step 7: Click Next
Click the "Next" button.

### Step 8: Fill Mission (Optional)
Fill the textarea if visible with company mission.

### Step 9: Click Next
Click the "Next" button.

### Step 10: Fill Task
Fill the first visible input with the task description.

**IMPORTANT**: Use Chinese task like "中文测试：请用纯中文回复" to test Chinese encoding.

### Step 11: Click "Create & Open Issue"
Click the button that says "Create & Open Issue" (NOT "Next" or "Launch").

### Step 12: Wait for Redirect
Wait for the page to automatically redirect from /onboarding to the company issue page. This usually takes 5-10 seconds.

### Step 13: Verify
Once on the issue page, verify the page loads correctly with no garbled text. Chinese content should display properly.

## Notes
- The last step button is "Create & Open Issue", not "Launch" or "Next"
- The onboarding flow has 4 steps: Company → Agent → Mission → Task
- Step 4 uses "Create & Open Issue" button to complete
- After clicking, the page will redirect to the new company's issue page
