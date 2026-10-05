require "csv"
module Reports
  class DailySummaryCsv
    LABELS = {
      "en" => ["Section", "Name", "Role", "Date", "Timezone", "Currency", "Bills completed", "Gross sales", "Discounts", "Sales after discounts", "Returns processed", "Return transactions", "Sales minus returns", "Store", "Employee", "Payment", "Former team member", "Note", "Returns use the original bill payment method, not actual refund tender. Employee returns belong to the processor. Store-wide totals; transaction filters do not apply."],
      "hi" => ["भाग", "नाम", "भूमिका", "तारीख", "समय क्षेत्र", "मुद्रा", "पूरे हुए बिल", "छूट से पहले बिक्री", "छूट", "छूट के बाद बिक्री", "दर्ज की गई वापसी", "वापसी के लेनदेन", "बिक्री में से वापसी घटाकर", "दुकान", "कर्मचारी", "भुगतान", "पूर्व कर्मचारी", "जानकारी", "वापसी मूल बिल के भुगतान तरीके के अनुसार है, वास्तविक रिफंड तरीके के अनुसार नहीं। कर्मचारी की वापसी दर्ज करने वाले के नाम है। पूरी दुकान के आंकड़े हैं; लेनदेन का फ़िल्टर लागू नहीं होता।"]
    }.freeze
    VALUES_HI = {"owner" => "मालिक", "admin" => "एडमिन", "manager" => "मैनेजर", "staff" => "कर्मचारी", "cash" => "नकद", "upi" => "यूपीआई", "card" => "कार्ड", "other" => "अन्य"}.freeze
    def self.call(summary:, business_name:, language: "en")
      labels = LABELS.fetch(language, LABELS["en"])
      translate = ->(value) { language == "hi" ? VALUES_HI.fetch(value, value) : value }
      # Escape user-controlled text only; generated negative numeric totals stay numeric.
      safe = ->(value) { value.to_s.match?(/\A[[:space:]]*[=+@\-\t\r\n]/) ? "'#{value}" : value }
      context = [summary[:date], summary[:timezone], summary[:currency]]
      totals = summary[:totals]
      "\uFEFF" + CSV.generate do |csv|
        csv << labels.first(13)
        csv << [labels[13], safe.call(business_name), nil, *context, totals[:bills], totals[:gross_sales], totals[:discounts], totals[:sales], totals[:returns], totals[:return_count], totals[:net]]
        summary[:employees].each do |employee|
          csv << [labels[14], safe.call(employee[:name]), translate.call(employee[:role] || labels[16]), *context, employee[:bills], nil, employee[:discounts], employee[:sales], employee[:returns_processed], employee[:return_count], nil]
        end
        summary[:payments].each do |payment|
          csv << [labels[15], translate.call(payment[:method]), nil, *context, nil, nil, nil, payment[:sales], payment[:returns], nil, payment[:net]]
        end
        csv << [labels[17], labels[18], nil, *context, *Array.new(7)]
      end
    end
  end
end
