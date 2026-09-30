require "rails_helper"
RSpec.describe "Product groups and barcode labels", type: :request do
  let(:user) { create(:user) }
  let(:business) { create(:business) }
  let!(:membership) { create(:business_membership, business: business, user: user) }
  let(:headers) { {"Authorization" => "Bearer #{Session.issue!(user)}", "X-Business-Id" => business.id.to_s} }
  let(:payload) { {name: "Classic Tee", idempotency_key: "setup-key", variants: [{size: "M", color: "Black", selling_price: "499", initial_quantity: "5"}, {size: "L", color: "Black", selling_price: "599", initial_quantity: "3"}]} }
  def setup_group(attributes = payload)
    post "/api/v1/product_groups", params: {product_group: attributes}, headers: headers, as: :json
  end
  it "creates individually stocked variants and safely retries the batch" do
    2.times { setup_group; expect(response).to have_http_status(:created) }
    expect(business.product_groups.count).to eq(1)
    expect(business.products.count).to eq(2)
    expect(business.stock_movements.sum(:quantity)).to eq(8)
    expect(business.products.pluck(:barcode).uniq.size).to eq(2)
    product = business.products.first
    get "/api/v1/products", params: {barcode: product.barcode}, headers: headers
    expect(response.parsed_body.dig("data", 0, "id")).to eq(product.id)
  end
  it "rolls back all variants if a duplicate combination is supplied" do
    a = payload.deep_dup
    a[:variants][1][:size] = "m"
    setup_group(a)
    expect(response).to have_http_status(:unprocessable_entity)
    expect(business.products.count).to eq(0)
    expect(business.product_groups.count).to eq(0)
    expect(business.stock_movements.count).to eq(0)
  end
  it "rejects invalid opening stock without leaving a partial group" do
    a = payload.deep_dup
    a[:variants][1][:initial_quantity] = "-1"
    setup_group(a)
    expect(response).to have_http_status(:unprocessable_entity)
    expect(business.products.count).to eq(0)
  end
  it "groups existing products without changing their ledger or identity" do
    p = create(:product, business: business, size: "M")
    Inventory::AdjustStock.call(product: p, user: user, quantity: 9, movement_type: "initial_stock", idempotency_key: "existing-opening")
    setup_group(name: "Existing Tees", idempotency_key: "existing", product_ids: [p.id])
    expect(response).to have_http_status(:created)
    expect(p.reload.product_group_id).to be_present
    expect(p.current_stock).to eq(9)
    expect(p.stock_movements.count).to eq(1)
    expect(p.name).to eq("Everyday Tee")
  end
  it "adds variants to the same group and rejects request-key reuse with changed data" do
    setup_group
    group = business.product_groups.first
    attrs = {idempotency_key: "add", variants: [{size: "XL", color: "Black", initial_quantity: "2"}]}
    2.times do
      post "/api/v1/product_groups/#{group.id}/add_variants", params: {product_group: attrs}, headers: headers, as: :json
      expect(response).to have_http_status(:ok)
    end
    expect(group.products.count).to eq(3)
    setup_group(payload.merge(name: "Different"))
    expect(response).to have_http_status(:unprocessable_entity)
  end
  it "never attaches a foreign product or exposes a foreign group" do
    foreign = create(:product)
    setup_group(name: "Foreign", idempotency_key: "foreign", product_ids: [foreign.id])
    expect(response).to have_http_status(:not_found)
    other_group = foreign.business.product_groups.create!(name: "Private")
    get "/api/v1/product_groups/#{other_group.id}", headers: headers
    expect(response).to have_http_status(:not_found)
    post "/api/v1/products/#{foreign.id}/generate_barcode", headers: headers
    expect(response).to have_http_status(:not_found)
  end
  it "allows staff to read groups but restricts setup and barcode generation" do
    setup_group
    product = business.products.first
    membership.update!(role: "staff")
    get "/api/v1/product_groups", headers: headers
    expect(response).to have_http_status(:ok)
    setup_group(payload.merge(idempotency_key: "staff"))
    expect(response).to have_http_status(:forbidden)
    post "/api/v1/products/#{product.id}/generate_barcode", headers: headers
    expect(response).to have_http_status(:forbidden)
  end
  it "generates a code once and never overwrites an existing barcode" do
    p = create(:product, business: business)
    post "/api/v1/products/#{p.id}/generate_barcode", headers: headers
    expect(response).to have_http_status(:ok)
    code = p.reload.barcode
    expect(code).to match(/\ASQ[A-F0-9]{12}\z/)
    post "/api/v1/products/#{p.id}/generate_barcode", headers: headers
    expect(p.reload.barcode).to eq(code)
    expect(business.activities.where(action: "barcode_generated").count).to eq(1)
  end
end
