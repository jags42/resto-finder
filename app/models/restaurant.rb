class Restaurant < ApplicationRecord
    validates :place_id, presence: true, uniqueness: true
    has_many :favorites
    has_many :reviews

    validates :price_level, inclusion: { in: %w[Free Inexpensive Moderate Expensive Very\ Expensive Unknown], allow_nil: true }
end
